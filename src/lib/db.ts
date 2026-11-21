// Локальное хранилище на устройстве (IndexedDB). Работает без интернета —
// в зале сеть часто пропадает. Синхронизацию с сервером добавим на этапе 2.
import Dexie, { type Table } from 'dexie';
import type { CatalogExercise, Session, Settings, WorkoutLog } from '../logic/types';

class AppDB extends Dexie {
  sessions!: Table<Session, string>;
  workouts!: Table<WorkoutLog, string>;
  custom!: Table<CatalogExercise, string>;
  kv!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super('fitness-tracker');
    this.version(1).stores({
      sessions: 'id, order',
      workouts: 'id, sessionId, startedAt, finishedAt',
      custom: 'id',
      kv: 'key',
    });
  }
}

export const db = new AppDB();

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

export const DEFAULT_SETTINGS: Settings = { theme: 'system', lang: 'ru', consentAt: null, sound: true };

export async function loadSettings(): Promise<Settings> {
  const row = await db.kv.get('settings');
  return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<Settings>) ?? {}) };
}

export async function saveSettings(s: Settings) {
  await db.kv.put({ key: 'settings', value: s });
}

/** Незавершённая тренировка (если приложение закрыли посреди тренировки) */
export async function activeWorkout(): Promise<WorkoutLog | undefined> {
  const all = await db.workouts.orderBy('startedAt').reverse().limit(5).toArray();
  return all.find((w) => w.finishedAt == null);
}

/** Последние выполнения упражнения — для прогрессии и «прошлого результата» */
export async function lastEntriesFor(exerciseId: string, beforeTs: number) {
  const logs = await db.workouts.where('startedAt').below(beforeTs).reverse().toArray();
  for (const log of logs) {
    if (log.finishedAt == null) continue;
    const entry = log.entries.find((e) => e.exerciseId === exerciseId && e.completedSets != null);
    if (entry) return { log, entry };
  }
  return undefined;
}
