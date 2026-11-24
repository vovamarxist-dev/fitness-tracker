// Клиенты Yandex Message Queue (SQS-совместимая очередь с задержкой доставки)
// и YDB Document API (DynamoDB-совместимые таблицы) поверх fetch + SigV4.
import { sign, type Creds } from './sigv4.ts';

const REGION = 'ru-central1';
export const YMQ_ENDPOINT = 'https://message-queue.api.cloud.yandex.net/';

export function credsFromEnv(): Creds {
  return { accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '', secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '' };
}

// ---------- Message Queue ----------

async function ymq(action: string, params: Record<string, string>, creds: Creds): Promise<string> {
  const body = new URLSearchParams({ Action: action, Version: '2012-11-05', ...params }).toString();
  const headers = sign({
    method: 'POST',
    url: YMQ_ENDPOINT,
    service: 'sqs',
    region: REGION,
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    creds,
  });
  const res = await fetch(YMQ_ENDPOINT, { method: 'POST', headers, body });
  const text = await res.text();
  if (!res.ok) throw new Error(`YMQ ${action} ${res.status}: ${text.slice(0, 300)}`);
  return text;
}

export async function createQueue(name: string, creds: Creds): Promise<string> {
  const xml = await ymq('CreateQueue', { QueueName: name }, creds);
  const m = xml.match(/<QueueUrl>([^<]+)<\/QueueUrl>/);
  if (!m) throw new Error('CreateQueue: no QueueUrl');
  return m[1];
}

export async function getQueueArn(queueUrl: string, creds: Creds): Promise<string> {
  const xml = await ymq('GetQueueAttributes', { QueueUrl: queueUrl, 'AttributeName.1': 'QueueArn' }, creds);
  const m = xml.match(/<Value>([^<]+)<\/Value>/);
  if (!m) throw new Error('GetQueueAttributes: no QueueArn');
  return m[1];
}

/** Максимальная задержка доставки в очереди — 15 минут */
export const MAX_DELAY_SEC = 900;

export async function sendDelayed(queueUrl: string, body: unknown, delaySec: number, creds: Creds) {
  const delay = Math.max(0, Math.min(MAX_DELAY_SEC, Math.round(delaySec)));
  await ymq('SendMessage', { QueueUrl: queueUrl, MessageBody: JSON.stringify(body), DelaySeconds: String(delay) }, creds);
}

// ---------- YDB Document API ----------

export class DocApi {
  private endpoint: string;
  private creds: Creds;
  constructor(endpoint: string, creds: Creds) {
    this.endpoint = endpoint;
    this.creds = creds;
  }

  async call<T = Record<string, unknown>>(op: string, payload: unknown): Promise<T> {
    const body = JSON.stringify(payload);
    const headers = sign({
      method: 'POST',
      url: this.endpoint,
      service: 'dynamodb',
      region: REGION,
      headers: { 'content-type': 'application/x-amz-json-1.0', 'x-amz-target': `DynamoDB_20120810.${op}` },
      body,
      creds: this.creds,
    });
    const res = await fetch(this.endpoint, { method: 'POST', headers, body });
    const text = await res.text();
    if (!res.ok) {
      const err = new Error(`DocAPI ${op} ${res.status}: ${text.slice(0, 300)}`) as Error & { conditional?: boolean };
      err.conditional = text.includes('ConditionalCheckFailed');
      throw err;
    }
    return (text ? JSON.parse(text) : {}) as T;
  }
}
