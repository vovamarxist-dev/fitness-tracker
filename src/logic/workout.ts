import { db, lastEntriesFor, uid } from '../lib/db';
import { getExercise } from '../data/catalog';
import { recommend } from './progression';
import type { RestRecord, Session, WorkoutLog } from './types';

export async function startWorkout(session: Session): Promise<WorkoutLog> {
  const now = Date.now();
  const log: WorkoutLog = {
    id: uid(),
    sessionId: session.id,
    sessionName: session.name,
    startedAt: now,
    finishedAt: null,
    entries: session.exercises.map((e) => ({
      uid: e.uid,
      exerciseId: e.exerciseId,
      plannedSets: e.sets,
      reps: e.reps,
      weight: e.weight,
      step: e.step,
      rest: e.rest,
      completedSets: null,
      rests: [],
      startedAt: 0,
      finishedAt: null,
    })),
    exerciseRests: [],
    cursor: { index: 0, setsDone: 0, phase: 'exercise', restStartedAt: null, restPlanned: 0 },
  };
  if (log.entries[0]) log.entries[0].startedAt = now;
  await db.workouts.put(log);
  return log;
}

/** Завершает тренировку и считает рекомендации по каждому выполненному упражнению */
export async function finishWorkout(log: WorkoutLog): Promise<WorkoutLog> {
  const done: WorkoutLog = { ...log, finishedAt: Date.now(), entries: [...log.entries] };
  for (let i = 0; i < done.entries.length; i++) {
    const e = done.entries[i];
    if (e.completedSets == null) continue;
    const ex = getExercise(e.exerciseId);
    const prev = await lastEntriesFor(e.exerciseId, done.startedAt);
    const reco = recommend(
      {
        weight: e.weight,
        reps: e.reps,
        plannedSets: e.plannedSets,
        completedSets: e.completedSets,
        step: e.step,
        mechanic: ex?.mechanic ?? 'compound',
        date: e.startedAt || done.startedAt,
        rests: e.rests,
        setReps: e.setReps,
        setWeights: e.setWeights,
        repCap: ex?.repCap,
        repStep: ex?.repStep,
        capNote: ex?.capNote,
      },
      prev?.entry.reco ? { state: prev.entry.reco.state, date: prev.entry.startedAt || prev.log.startedAt } : undefined,
    );
    done.entries[i] = { ...e, reco };
  }
  await db.workouts.put(done);
  return done;
}

export async function applyToPlan(log: WorkoutLog) {
  const session = await db.sessions.get(log.sessionId);
  if (session) {
    const exercises = session.exercises.map((pe) => {
      const entry = log.entries.find((e) => e.uid === pe.uid);
      if (!entry?.reco) return pe;
      return { ...pe, weight: entry.reco.nextWeight, reps: entry.reco.nextReps };
    });
    await db.sessions.put({ ...session, exercises, updatedAt: Date.now() });
  }
  await db.workouts.update(log.id, { applied: true });
}

export function discipline(log: WorkoutLog) {
  const all: RestRecord[] = [...log.entries.flatMap((e) => e.rests), ...log.exerciseRests];
  if (all.length === 0) return null;
  const GRACE = 10; // сек — небольшой люфт, чтобы дойти до снаряда
  // Вовремя — значит не раньше и не позже плана: отдых держим строго в обе стороны
  const onTime = all.filter((r) => Math.abs(r.actual - r.planned) <= GRACE).length;
  const over = all.map((r) => Math.max(0, r.actual - r.planned));
  return {
    total: all.length,
    onTime,
    percent: Math.round((onTime / all.length) * 100),
    avgOver: Math.round(over.reduce((s, x) => s + x, 0) / all.length),
  };
}

/** Примерная длительность тренировки в минутах: ~45 с на подход + отдых между подходами и упражнениями */
export function estimateMin(s: Session) {
  const between = s.restExercises ?? 150;
  const sec =
    s.exercises.reduce((sum, ex) => sum + ex.sets * 45 + Math.max(0, ex.sets - 1) * (ex.rest ?? 120), 0) + Math.max(0, s.exercises.length - 1) * between;
  return Math.max(5, Math.round(sec / 60 / 5) * 5);
}
