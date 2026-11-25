// Пересыльщик Telegram Bot API для бэкенда «Тренировыча» в Yandex Cloud:
// из российских дата-центров api.telegram.org недоступен, из Netlify (США) — доступен.
// Пускает только запросы с общим секретом и только нужные методы бота.
// Окружение Netlify: BOT_TOKEN, RELAY_SECRET.
const ALLOWED = new Set(['sendMessage', 'deleteMessage']);

export default async (req) => {
  if (req.method !== 'POST') return new Response('ok');
  const secret = process.env.RELAY_SECRET ?? '';
  const got = req.headers.get('x-relay-secret') ?? '';
  if (!secret || got.length !== secret.length || !timingSafe(got, secret)) return new Response('forbidden', { status: 403 });
  let payload;
  try {
    payload = await req.json();
  } catch {
    return new Response('bad json', { status: 400 });
  }
  if (!ALLOWED.has(payload?.method)) return new Response('method not allowed', { status: 400 });
  const res = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/${payload.method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload.body ?? {}),
  });
  return new Response(await res.text(), { status: res.status, headers: { 'Content-Type': 'application/json' } });
};

function timingSafe(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export const config = { path: '/tg' };
