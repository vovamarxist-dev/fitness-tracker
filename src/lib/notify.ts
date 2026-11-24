// Напоминания об окончании отдыха через бота, когда приложение свёрнуто.
// Сервер: server/main.ts (Deno Deploy). Адрес задаётся при сборке: VITE_NOTIFY_URL.
// Запросы — text/plain, чтобы браузер не делал предварительный CORS-запрос и
// fetch с keepalive успел уйти, даже если Telegram закрывает приложение.
import { tg } from './telegram';
import { db } from './db';

const BASE = (import.meta.env.VITE_NOTIFY_URL ?? '').replace(/\/$/, '');

export const remindersAvailable = () => !!BASE && !!tg;

function post(path: string, body: Record<string, unknown>) {
  if (!remindersAvailable()) return;
  try {
    void fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ initData: tg!.initData, ...body }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* без сети напоминание просто не придёт — таймер в приложении работает и так */
  }
}

export function scheduleRestReminder(restId: string, endsAt: number, next: string) {
  post('/rest/start', { restId, endsAt, next });
}

export function cancelRestReminder(restId: string) {
  post('/rest/stop', { restId });
}

/** Разрешение боту писать пользователю (нужно один раз). Возвращает true, если разрешено. */
export async function ensureWriteAccess(): Promise<boolean> {
  if (!remindersAvailable()) return false;
  const row = await db.kv.get('writeAccess');
  if (row?.value === true) return true;
  if (!tg!.isVersionAtLeast('6.9') || !tg!.requestWriteAccess) return true; // старый клиент: бот пишет, если чат начат
  const granted = await new Promise<boolean>((resolve) => tg!.requestWriteAccess!((ok) => resolve(ok)));
  await db.kv.put({ key: 'writeAccess', value: granted });
  return granted;
}
