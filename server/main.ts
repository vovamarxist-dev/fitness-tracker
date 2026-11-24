// Сервер напоминаний для бота «Машина» (Deno Deploy).
// Когда пользователь сворачивает Mini App во время отдыха, приложение просит сервер напомнить:
//   за 10 секунд до конца отдыха, в момент окончания и через минуту перебора.
// Когда пользователь возвращается в приложение или начинает подход — напоминания отменяются,
// а уже отправленные сообщения удаляются, чтобы не засорять чат.
//
// Переменные окружения (задаются в панели Deno Deploy, в код не попадают):
//   BOT_TOKEN      — токен бота
//   APP_URL        — адрес Mini App (кнопка «Вернуться к тренировке»)
//   ALLOWED_ORIGIN — откуда разрешены запросы (адрес GitHub Pages)
import { verifyInitData } from './initdata.ts';

const TOKEN = Deno.env.get('BOT_TOKEN') ?? '';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://vovamarxist-dev.github.io/fitness-tracker/';
const ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://vovamarxist-dev.github.io';

const kv = await Deno.openKv();

type Kind = 'soon' | 'end' | 'over';
interface Job {
  uid: number;
  restId: string;
  kind: Kind;
  next: string;
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

async function tg(method: string, body: unknown) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function deleteMessages(uid: number, ids: number[]) {
  for (const message_id of ids) await tg('deleteMessage', { chat_id: uid, message_id }).catch(() => {});
}

kv.listenQueue(async (raw) => {
  const job = raw as Job;
  const key = ['rest', job.uid];
  const cur = await kv.get<RestState>(key);
  // Отдых уже закончился или начался новый — напоминание не нужно
  if (!cur.value || cur.value.restId !== job.restId) return;
  const sent = await tg('sendMessage', {
    chat_id: job.uid,
    text: TEXT[job.kind](job.next),
    reply_markup: { inline_keyboard: [[{ text: 'Вернуться к тренировке', web_app: { url: APP_URL } }]] },
  });
  // Предыдущее напоминание этого отдыха удаляем — в чате остаётся только актуальное
  await deleteMessages(job.uid, cur.value.msgs);
  const msgs = sent?.ok ? [sent.result.message_id as number] : [];
  const again = await kv.get<RestState>(key);
  if (again.value?.restId === job.restId) await kv.set(key, { ...again.value, msgs }, { expireIn: 30 * 60 * 1000 });
  else await deleteMessages(job.uid, msgs); // отдых отменили, пока отправляли
});

function cors(res: Response) {
  res.headers.set('Access-Control-Allow-Origin', ORIGIN);
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const text = await req.text();
    if (text.length > 8000) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (req.method === 'OPTIONS') return cors(new Response(null, { status: 204 }));
  if (req.method === 'GET' && url.pathname === '/') return new Response('ok');
  if (req.method !== 'POST') return cors(new Response('not found', { status: 404 }));

  const body = await readBody(req);
  const uid = body ? await verifyInitData(String(body.initData ?? ''), TOKEN) : null;
  if (!uid) return cors(new Response('unauthorized', { status: 401 }));
  const restId = String(body!.restId ?? '').slice(0, 64);
  if (!restId) return cors(new Response('bad request', { status: 400 }));
  const key = ['rest', uid];

  if (url.pathname === '/rest/start') {
    const now = Date.now();
    const endsAt = Number(body!.endsAt);
    if (!Number.isFinite(endsAt) || endsAt < now - 30 * 60 * 1000 || endsAt > now + 30 * 60 * 1000) {
      return cors(new Response('bad endsAt', { status: 400 }));
    }
    const next = String(body!.next ?? '').slice(0, 120);
    const prev = await kv.get<RestState>(key);
    if (prev.value?.restId === restId) return cors(new Response('already scheduled'));
    if (prev.value) await deleteMessages(uid, prev.value.msgs);
    await kv.set(key, { restId, endsAt, msgs: [] }, { expireIn: 30 * 60 * 1000 });

    const plan: [Kind, number][] =
      endsAt > now
        ? [
            ['soon', endsAt - 10_000],
            ['end', endsAt],
            ['over', endsAt + 60_000],
          ]
        : [['over', Math.max(now + 20_000, endsAt + 60_000)]];
    for (const [kind, at] of plan) {
      if (kind === 'soon' && at < now + 2_000) continue;
      await kv.enqueue({ uid, restId, kind, next } satisfies Job, { delay: Math.max(0, at - now) });
    }
    return cors(new Response('scheduled'));
  }

  if (url.pathname === '/rest/stop') {
    const cur = await kv.get<RestState>(key);
    if (cur.value?.restId === restId) {
      await kv.delete(key);
      await deleteMessages(uid, cur.value.msgs);
    }
    return cors(new Response('stopped'));
  }

  return cors(new Response('not found', { status: 404 }));
});
