// Проверка подписи Telegram Mini App initData.
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
// secret = HMAC_SHA256(key = "WebAppData", data = bot_token)
// hash   = hex(HMAC_SHA256(key = secret, data = data_check_string))

const enc = new TextEncoder();
const bytes = (s: string): Uint8Array<ArrayBuffer> => new Uint8Array(enc.encode(s));

async function hmac(key: Uint8Array<ArrayBuffer> | ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, bytes(data));
}

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** Возвращает id пользователя Telegram, если подпись верна и данные не старше maxAgeSec */
export async function verifyInitData(initData: string, botToken: string, maxAgeSec = 24 * 3600, now = Date.now()): Promise<number | null> {
  if (!initData || !botToken) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');
  const dataCheck = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = await hmac(bytes('WebAppData'), botToken);
  const expected = hex(await hmac(secret, dataCheck));
  // Сравнение за постоянное время
  if (expected.length !== hash.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ hash.charCodeAt(i);
  if (diff !== 0) return null;

  const authDate = Number(params.get('auth_date'));
  if (!authDate || now / 1000 - authDate > maxAgeSec) return null;
  try {
    const user = JSON.parse(params.get('user') ?? 'null');
    return typeof user?.id === 'number' ? user.id : null;
  } catch {
    return null;
  }
}

/** Для тестов: собирает корректно подписанный initData */
export async function signInitData(fields: Record<string, string>, botToken: string): Promise<string> {
  const params = new URLSearchParams(fields);
  const dataCheck = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = await hmac(bytes('WebAppData'), botToken);
  params.set('hash', hex(await hmac(secret, dataCheck)));
  return params.toString();
}
