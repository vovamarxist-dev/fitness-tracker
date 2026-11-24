// Минимальная подпись AWS Signature V4 — для Yandex Message Queue и YDB Document API
// (оба совместимы с AWS). Свой код вместо AWS SDK: меньше бандл и нет сюрпризов
// с протоколами, которые SDK меняет между версиями.
import { createHash, createHmac } from 'node:crypto';

export interface Creds {
  accessKeyId: string;
  secretAccessKey: string;
}

const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
const hmac = (key: Buffer | string, s: string) => createHmac('sha256', key).update(s, 'utf8').digest();

/** Подписывает запрос, возвращает заголовки для fetch */
export function sign(opts: {
  method: string;
  url: string;
  service: string;
  region: string;
  headers: Record<string, string>;
  body: string;
  creds: Creds;
  now?: Date;
}): Record<string, string> {
  const u = new URL(opts.url);
  const now = opts.now ?? new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); // 20261124T193000Z
  const day = amzDate.slice(0, 8);
  const headers: Record<string, string> = { ...opts.headers, host: u.host, 'x-amz-date': amzDate };
  const names = Object.keys(headers)
    .map((h) => h.toLowerCase())
    .sort();
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v).trim()]));
  const canonicalHeaders = names.map((h) => `${h}:${lower[h]}\n`).join('');
  const signed = names.join(';');
  const query = [...u.searchParams.entries()]
    .map(([k, v]) => [encodeURIComponent(k), encodeURIComponent(v)])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const path = u.pathname
    .split('/')
    .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
    .join('/');
  const canonical = [opts.method, path || '/', query, canonicalHeaders, signed, sha256(opts.body)].join('\n');
  const scope = `${day}/${opts.region}/${opts.service}/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
  let k = hmac('AWS4' + opts.creds.secretAccessKey, day);
  k = hmac(k, opts.region);
  k = hmac(k, opts.service);
  k = hmac(k, 'aws4_request');
  const signature = createHmac('sha256', k).update(toSign, 'utf8').digest('hex');
  return {
    ...headers,
    authorization: `AWS4-HMAC-SHA256 Credential=${opts.creds.accessKeyId}/${scope}, SignedHeaders=${signed}, Signature=${signature}`,
  };
}
