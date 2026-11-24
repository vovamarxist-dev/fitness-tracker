// Бэкенд «Машины» в Yandex Cloud Functions. Одна функция обслуживает два источника:
//  1) HTTP через API Gateway: POST /rest/start, POST /rest/stop (приложение свернули/вернулись)
//  2) триггер Message Queue: отложенные напоминания — за 10 с до конца отдыха,
//     в момент окончания и через минуту перебора.
// Когда пользователь возвращается в приложение, напоминания отменяются, а уже отправленные
// сообщения удаляются, чтобы в чате оставалось только актуальное.
//
// Окружение функции: BOT_TOKEN, APP_URL, ALLOWED_ORIGIN, QUEUE_URL, DOCAPI_ENDPOINT,
// AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (статический ключ сервисного аккаунта).
import { verifyInitData } from '../../server/initdata.ts';
import { credsFromEnv, DocApi, MAX_DELAY_SEC, sendDelayed } from './yc.ts';

const env = (k: string, d = '') => process.env[k] ?? d;
const TOKEN = env('BOT_TOKEN');
const APP_URL = env('APP_URL', 'https://vovamarxist-dev.github.io/fitness-tracker/');
const ORIGIN = env('ALLOWED_ORIGIN', 'https://vovamarxist-dev.github.io');
const QUEUE_URL = env('QUEUE_URL');
const creds = credsFromEnv();
const db = new DocApi(env('DOCAPI_ENDPOINT'), creds);
const TABLE = 'rest_state';

type Kind = 'soon' | 'end' | 'over';
interface Job {
  uid: number;
  restId: string;
  kind: Kind;
  next: string;
  at: number; // когда отправить, мс
}
interface RestState {
  restId: string;
  endsAt: number;
  msgs: number[];
}

const TEXT: Record<Kind, (next: string) => string> = {
  soon: (next) => `⏱ 10 секунд до конца отдыха.\nДальше: ${next}`,
  end: (next) => `🔥 Отдых окончен — работать!\nДальше: ${next}`,
  over: () => `⚠️ Отдых затянулся уже на минуту. Вернись к снаряду — машина сама себя не построит.`,
};

// ---------- состояние отдыха ----------

async function getState(uid: number): Promise<RestState | null> {
  const r = await db.call<{ Item?: Record<string, { S?: string; N?: string }> }>('GetItem', {
    TableName: TABLE,
    Key: { uid: { N: String(uid) } },
    ConsistentRead: true,
  });
  if (!r.Item?.restId?.S) return null;
  return { restId: r.Item.restId.S, endsAt: Number(r.Item.endsAt?.N ?? 0), msgs: JSON.parse(r.Item.msgs?.S ?? '[]') };
}

async function putState(uid: number, s: RestState) {
  await db.call('PutItem', {
    TableName: TABLE,
    Item: {
      uid: { N: String(uid) },
      restId: { S: s.restId },
      endsAt: { N: String(s.endsAt) },
      msgs: { S: JSON.stringify(s.msgs) },
    },
  });
}

/** Обновляет список сообщений, только если отдых всё ещё тот же. false — отдых уже сменился */
async function setMsgsIf(uid: number, restId: string, msgs: number[]): Promise<boolean> {
  try {
    await db.call('UpdateItem', {
      TableName: TABLE,
      Key: { uid: { N: String(uid) } },
      UpdateExpression: 'SET msgs = :m',
      ConditionExpression: 'restId = :r',
      ExpressionAttributeValues: { ':m': { S: JSON.stringify(msgs) }, ':r': { S: restId } },
    });
    return true;
  } catch (e) {
    if ((e as { conditional?: boolean }).conditional) return false;
    throw e;
  }
}

async function deleteState(uid: number) {
  await db.call('DeleteItem', { TableName: TABLE, Key: { uid: { N: String(uid) } } });
}

// ---------- Telegram ----------

// Из российских дата-центров api.telegram.org недоступен, поэтому сообщения уходят
// через пересыльщик за рубежом (relay/, Netlify Functions). Без TG_RELAY_URL — напрямую.
const RELAY = env('TG_RELAY_URL');
const RELAY_SECRET = env('TG_RELAY_SECRET');

async function tg(method: string, body: unknown): Promise<{ ok: boolean; result?: { message_id: number } }> {
  const res = RELAY
    ? await fetch(RELAY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Relay-Secret': RELAY_SECRET },
        body: JSON.stringify({ method, body }),
        signal: AbortSignal.timeout(8000),
      })
    : await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });
  return res.json() as Promise<{ ok: boolean; result?: { message_id: number } }>;
}

async function deleteMessages(uid: number, ids: number[]) {
  if (!ids.length) return;
  await Promise.all(ids.map((message_id) => tg('deleteMessage', { chat_id: uid, message_id }).catch(() => {})));
}

// ---------- очередь: отправка напоминания ----------

async function handleJob(job: Job) {
  const left = job.at - Date.now();
  // Очередь держит не дольше 15 минут — длинный отдых откладываем повторно
  if (left > 1500) {
    await sendDelayed(QUEUE_URL, job, Math.min(MAX_DELAY_SEC, left / 1000), creds);
    return;
  }
  const cur = await getState(job.uid);
  if (!cur || cur.restId !== job.restId) return; // отдых закончился или начался новый
  const sent = await tg('sendMessage', {
    chat_id: job.uid,
    text: TEXT[job.kind](job.next),
    reply_markup: { inline_keyboard: [[{ text: 'Вернуться к тренировке', web_app: { url: APP_URL } }]] },
  });
  await deleteMessages(job.uid, cur.msgs); // в чате — только актуальное напоминание
  const msgs = sent.ok && sent.result ? [sent.result.message_id] : [];
  if (!(await setMsgsIf(job.uid, job.restId, msgs))) await deleteMessages(job.uid, msgs); // отменили, пока отправляли
}

// ---------- HTTP ----------

interface HttpEvent {
  httpMethod?: string;
  path?: string;
  url?: string;
  pathParams?: Record<string, string>;
  params?: Record<string, string>;
  body?: string;
  isBase64Encoded?: boolean;
}
interface HttpResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const reply = (statusCode: number, body = ''): HttpResult => ({
  statusCode,
  headers: {
    'Access-Control-Allow-Origin': ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'text/plain; charset=utf-8',
  },
  body,
});

function routeOf(e: HttpEvent): string {
  const proxy = e.pathParams?.proxy ?? e.params?.proxy;
  if (proxy) return '/' + proxy.replace(/^\/+/, '');
  const raw = e.url ?? e.path ?? '/';
  return raw.split('?')[0];
}

function parseBody(e: HttpEvent): Record<string, unknown> | null {
  try {
    const text = e.isBase64Encoded ? Buffer.from(e.body ?? '', 'base64').toString('utf8') : (e.body ?? '');
    if (text.length > 8000) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function handleHttp(e: HttpEvent): Promise<HttpResult> {
  const method = (e.httpMethod ?? 'GET').toUpperCase();
  const route = routeOf(e);
  if (method === 'OPTIONS') return reply(204);
  if (method === 'GET' && (route === '/' || route === '/health')) return reply(200, 'ok');
  if (method !== 'POST') return reply(404, 'not found');

  const body = parseBody(e);
  const uid = body ? await verifyInitData(String(body.initData ?? ''), TOKEN) : null;
  if (!uid) return reply(401, 'unauthorized');
  const restId = String(body!.restId ?? '').slice(0, 64);
  if (!restId) return reply(400, 'bad request');

  if (route === '/rest/start') {
    const now = Date.now();
    const endsAt = Number(body!.endsAt);
    if (!Number.isFinite(endsAt) || endsAt < now - 30 * 60_000 || endsAt > now + 30 * 60_000) return reply(400, 'bad endsAt');
    const next = String(body!.next ?? '').slice(0, 120);
    const prev = await getState(uid);
    if (prev?.restId === restId) return reply(200, 'already scheduled');
    if (prev) await deleteMessages(uid, prev.msgs);
    await putState(uid, { restId, endsAt, msgs: [] });

    const plan: [Kind, number][] =
      endsAt > now
        ? [
            ['soon', endsAt - 10_000],
            ['end', endsAt],
            ['over', endsAt + 60_000],
          ]
        : [['over', Math.max(now + 20_000, endsAt + 60_000)]];
    await Promise.all(
      plan
        .filter(([kind, at]) => !(kind === 'soon' && at < now + 2_000))
        .map(([kind, at]) => sendDelayed(QUEUE_URL, { uid, restId, kind, next, at } satisfies Job, Math.min(MAX_DELAY_SEC, (at - now) / 1000), creds)),
    );
    return reply(200, 'scheduled');
  }

  if (route === '/rest/stop') {
    const cur = await getState(uid);
    if (cur?.restId === restId) {
      await deleteState(uid);
      await deleteMessages(uid, cur.msgs);
    }
    return reply(200, 'stopped');
  }

  return reply(404, 'not found');
}

// ---------- точка входа ----------

interface QueueEvent {
  messages: { details?: { message?: { body?: string } } }[];
}

export async function handler(event: HttpEvent | QueueEvent): Promise<HttpResult | { statusCode: number }> {
  if ('messages' in event && Array.isArray(event.messages)) {
    for (const m of event.messages) {
      const raw = m.details?.message?.body;
      if (!raw) continue;
      try {
        await handleJob(JSON.parse(raw) as Job);
      } catch (err) {
        // Не пробрасываем: повтор через минуты бессмыслен (напоминание устарело),
        // а бесконечные повторы съели бы бесплатный лимит
        console.error('job failed', String(err));
      }
    }
    return { statusCode: 200 };
  }
  try {
    return await handleHttp(event as HttpEvent);
  } catch (err) {
    console.error('http failed', String(err));
    return reply(500, 'error');
  }
}
