// Генератор планов по популярным сплитам. Упражнения — из каталога, рабочие веса пользователь
// ставит сам на первой тренировке (вес у всех разный), остальное — подходы, повторы, отдых, шаг —
// заполняется автоматически.
import { getExercise } from '../data/catalog';
import { uid } from '../lib/db';
import type { PlanExercise, Session } from './types';

export type Goal = 'strength' | 'mass' | 'tone';

interface DayTpl {
  name: string;
  main: string[]; // базовые: тяжелее, меньше повторов, длиннее отдых
  acc: string[]; // вспомогательные и изоляция
}

export interface SplitTpl {
  id: string;
  name: string;
  days: number;
  level: string;
  about: string;
  plan: DayTpl[];
}

// Частые id для краткости
const BENCH = 'Barbell_Bench_Press_-_Medium_Grip';
const SQUAT = 'Barbell_Squat';
const DEAD = 'Barbell_Deadlift';
const OHP = 'Standing_Military_Press';
const ROW = 'Bent_Over_Barbell_Row';

export const SPLITS: SplitTpl[] = [
  {
    id: 'fullbody',
    name: 'Фулбоди',
    days: 3,
    level: 'Новичкам',
    about: 'Всё тело за тренировку, три разных дня A/B/C. Лучший старт: каждая мышца получает нагрузку трижды в неделю.',
    plan: [
      { name: 'Фулбоди · A', main: [SQUAT, BENCH, ROW], acc: ['Side_Lateral_Raise', 'Barbell_Curl', 'Plank'] },
      { name: 'Фулбоди · B', main: [DEAD, OHP, 'Wide-Grip_Lat_Pulldown'], acc: ['Dumbbell_Lunges', 'Triceps_Pushdown', 'Hanging_Leg_Raise'] },
      { name: 'Фулбоди · C', main: ['Leg_Press', 'Incline_Dumbbell_Press', 'Seated_Cable_Rows'], acc: ['Romanian_Deadlift', 'Face_Pull', 'Hammer_Curls'] },
    ],
  },
  {
    id: 'upperlower',
    name: 'Верх / Низ',
    days: 4,
    level: 'Новичкам и среднему уровню',
    about: 'Два дня на верх, два на низ. Каждая мышца дважды в неделю, при этом тренировки короче, чем фулбоди.',
    plan: [
      { name: 'Верх · A', main: [BENCH, ROW, 'Dumbbell_Shoulder_Press'], acc: ['Wide-Grip_Lat_Pulldown', 'Barbell_Curl', 'Triceps_Pushdown'] },
      { name: 'Низ · A', main: [SQUAT, 'Romanian_Deadlift'], acc: ['Leg_Extensions', 'Lying_Leg_Curls', 'Standing_Calf_Raises', 'Cable_Crunch'] },
      { name: 'Верх · B', main: ['Incline_Dumbbell_Press', 'Pullups', 'Seated_Cable_Rows'], acc: ['Side_Lateral_Raise', 'Hammer_Curls', 'EZ-Bar_Skullcrusher'] },
      { name: 'Низ · B', main: [DEAD, 'Leg_Press'], acc: ['Split_Squat_with_Dumbbells', 'Seated_Leg_Curl', 'Seated_Calf_Raise', 'Hanging_Leg_Raise'] },
    ],
  },
  {
    id: 'ppl',
    name: 'Тяни-толкай-ноги',
    days: 3,
    level: 'Среднему уровню',
    about: 'Классический PPL: жимовые мышцы, тянущие мышцы и ноги в отдельные дни. Можно крутить 3 или 6 дней в неделю.',
    plan: [
      { name: 'PPL · Толкай', main: [BENCH, OHP, 'Incline_Dumbbell_Press'], acc: ['Side_Lateral_Raise', 'Triceps_Pushdown_-_Rope_Attachment', 'Standing_Dumbbell_Triceps_Extension'] },
      { name: 'PPL · Тяни', main: ['Pullups', ROW, 'Seated_Cable_Rows'], acc: ['Face_Pull', 'Barbell_Curl', 'Hammer_Curls'] },
      { name: 'PPL · Ноги', main: [SQUAT, 'Romanian_Deadlift', 'Leg_Press'], acc: ['Lying_Leg_Curls', 'Standing_Calf_Raises', 'Hanging_Leg_Raise'] },
    ],
  },
  {
    id: 'ppl6',
    name: 'Тяни-толкай-ноги ×2',
    days: 6,
    level: 'Продвинутым',
    about: 'PPL дважды в неделю с разными упражнениями в днях A и B. Большой объём — для тех, кто тренируется давно и хорошо восстанавливается.',
    plan: [
      { name: 'PPL · Толкай A', main: [BENCH, OHP, 'Incline_Dumbbell_Press'], acc: ['Side_Lateral_Raise', 'Triceps_Pushdown_-_Rope_Attachment', 'Standing_Dumbbell_Triceps_Extension'] },
      { name: 'PPL · Тяни A', main: ['Pullups', ROW, 'Seated_Cable_Rows'], acc: ['Face_Pull', 'Barbell_Curl', 'Hammer_Curls'] },
      { name: 'PPL · Ноги A', main: [SQUAT, 'Romanian_Deadlift', 'Leg_Press'], acc: ['Lying_Leg_Curls', 'Standing_Calf_Raises', 'Hanging_Leg_Raise'] },
      { name: 'PPL · Толкай B', main: ['Barbell_Incline_Bench_Press_-_Medium_Grip', 'Dumbbell_Shoulder_Press', 'Dips_-_Triceps_Version'], acc: ['Cable_Crossover', 'Cable_Seated_Lateral_Raise', 'EZ-Bar_Skullcrusher'] },
      { name: 'PPL · Тяни B', main: [DEAD, 'Wide-Grip_Lat_Pulldown', 'One-Arm_Dumbbell_Row'], acc: ['Reverse_Flyes', 'EZ-Bar_Curl', 'Incline_Dumbbell_Curl'] },
      { name: 'PPL · Ноги B', main: ['Front_Barbell_Squat', 'Barbell_Hip_Thrust'], acc: ['Dumbbell_Lunges', 'Leg_Extensions', 'Seated_Leg_Curl', 'Seated_Calf_Raise'] },
    ],
  },
  {
    id: 'pushpull',
    name: 'Тяни-толкай',
    days: 4,
    level: 'Среднему уровню',
    about: 'Два типа дней: «толкай» (жимы + квадрицепс) и «тяни» (тяги + задняя поверхность бедра). Каждый — дважды в неделю.',
    plan: [
      { name: 'Толкай · A', main: [SQUAT, BENCH, OHP], acc: ['Leg_Extensions', 'Side_Lateral_Raise', 'Triceps_Pushdown'] },
      { name: 'Тяни · A', main: [DEAD, 'Pullups', ROW], acc: ['Lying_Leg_Curls', 'Face_Pull', 'Barbell_Curl'] },
      { name: 'Толкай · B', main: ['Leg_Press', 'Incline_Dumbbell_Press', 'Dumbbell_Shoulder_Press'], acc: ['Dips_-_Triceps_Version', 'Standing_Calf_Raises', 'Standing_Dumbbell_Triceps_Extension'] },
      { name: 'Тяни · B', main: ['Romanian_Deadlift', 'Wide-Grip_Lat_Pulldown', 'Seated_Cable_Rows'], acc: ['Barbell_Hip_Thrust', 'Reverse_Flyes', 'Hammer_Curls'] },
    ],
  },
  {
    id: 'split3',
    name: 'Классический сплит',
    days: 3,
    level: 'Среднему уровню',
    about: 'Самый популярный сплит в наших залах: грудь + трицепс, спина + бицепс, ноги + плечи.',
    plan: [
      { name: 'Грудь + трицепс', main: [BENCH, 'Incline_Dumbbell_Press', 'Dips_-_Triceps_Version'], acc: ['Dumbbell_Flyes', 'Close-Grip_Barbell_Bench_Press', 'Triceps_Pushdown'] },
      { name: 'Спина + бицепс', main: ['Pullups', ROW, 'Wide-Grip_Lat_Pulldown'], acc: ['Seated_Cable_Rows', 'Barbell_Curl', 'Hammer_Curls'] },
      { name: 'Ноги + плечи', main: [SQUAT, 'Leg_Press', OHP], acc: ['Lying_Leg_Curls', 'Standing_Calf_Raises', 'Side_Lateral_Raise'] },
    ],
  },
  {
    id: 'bro',
    name: 'Сплит по группам мышц',
    days: 5,
    level: 'Продвинутым',
    about: 'Одна большая группа в день, пять тренировок в неделю. Много объёма на мышцу, но каждая работает раз в неделю.',
    plan: [
      { name: 'Грудь', main: [BENCH, 'Incline_Dumbbell_Press', 'x_dips_chest'], acc: ['Cable_Crossover', 'Butterfly'] },
      { name: 'Спина', main: [DEAD, 'Pullups', ROW], acc: ['Seated_Cable_Rows', 'Straight-Arm_Pulldown'] },
      { name: 'Плечи', main: [OHP, 'Dumbbell_Shoulder_Press'], acc: ['Side_Lateral_Raise', 'Reverse_Flyes', 'Barbell_Shrug'] },
      { name: 'Ноги', main: [SQUAT, 'Leg_Press', 'Romanian_Deadlift'], acc: ['Leg_Extensions', 'Lying_Leg_Curls', 'Standing_Calf_Raises'] },
      { name: 'Руки', main: ['Close-Grip_Barbell_Bench_Press', 'Barbell_Curl'], acc: ['EZ-Bar_Skullcrusher', 'Incline_Dumbbell_Curl', 'Triceps_Pushdown_-_Rope_Attachment', 'Hammer_Curls'] },
    ],
  },
];

export const GOALS: { id: Goal; name: string; about: string }[] = [
  { id: 'strength', name: 'Сила', about: 'База 5×5, длинный отдых' },
  { id: 'mass', name: 'Масса', about: 'База 4×8, изоляция 3×12' },
  { id: 'tone', name: 'Рельеф', about: '3×12–15, короткий отдых' },
];

function scheme(goal: Goal, main: boolean): { sets: number; reps: number; restK: number } {
  if (goal === 'strength') return main ? { sets: 5, reps: 5, restK: 1.25 } : { sets: 3, reps: 8, restK: 1 };
  if (goal === 'mass') return main ? { sets: 4, reps: 8, restK: 1 } : { sets: 3, reps: 12, restK: 1 };
  return main ? { sets: 3, reps: 12, restK: 0.75 } : { sets: 3, reps: 15, restK: 0.75 };
}

function planExercise(id: string, goal: Goal, main: boolean): PlanExercise | null {
  const ex = getExercise(id);
  if (!ex) return null;
  const sc = scheme(goal, main);
  let reps = sc.reps;
  // Свой вес: повторы ближе к реальности (подтягивания не 15, планка в секундах)
  if (ex.step === 0) {
    if ((ex.repStep ?? 1) > 1) reps = goal === 'tone' ? 60 : 45;
    else if (ex.repCap) reps = Math.min(reps, Math.max(5, ex.repCap - 4));
  }
  const rest = Math.max(45, Math.min(300, Math.round((ex.rest * sc.restK) / 15) * 15));
  return { uid: uid(), exerciseId: id, sets: sc.sets, reps, weight: 0, step: ex.step, rest };
}

export function generateSessions(split: SplitTpl, goal: Goal, startOrder: number): Session[] {
  const now = Date.now();
  return split.plan.map((d, i) => ({
    id: uid(),
    name: d.name,
    exercises: [
      ...d.main.map((id) => planExercise(id, goal, true)),
      ...d.acc.map((id) => planExercise(id, goal, false)),
    ].filter((x): x is PlanExercise => x != null),
    restExercises: goal === 'strength' ? 180 : goal === 'mass' ? 150 : 120,
    order: startOrder + i,
    createdAt: now,
    updatedAt: now,
    generated: split.id,
  }));
}
