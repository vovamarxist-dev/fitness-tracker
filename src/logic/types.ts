export type Equipment = 'barbell' | 'smith' | 'ezbar' | 'dumbbell' | 'machine' | 'cable' | 'body' | 'kettlebell';
export type Mechanic = 'compound' | 'isolation';
export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms'
  | 'legs' | 'glutes' | 'calves' | 'abs' | 'other';

export interface CatalogExercise {
  id: string;
  ru: string;
  en: string;
  group: MuscleGroup;
  muscles: string[];
  equipment: Equipment;
  mechanic: Mechanic;
  anim: string;
  step: number; // рекомендованный шаг прибавки, кг (0 — собственный вес, прогрессия повторами)
  stepNote?: string; // почему такой шаг
  rest: number; // рекомендованный отдых между подходами, сек
  repCap?: number; // для своего веса: после скольких повторов усложнять
  repStep?: number; // для своего веса: на сколько повторов прибавлять
  capNote?: string; // что делать, когда достигнут repCap
  custom?: boolean;
}

/** Упражнение внутри тренировки плана */
export interface PlanExercise {
  uid: string;
  exerciseId: string;
  sets: number;
  reps: number;
  weight: number; // кг; 0 — без веса
  step: number;
  rest: number; // отдых между подходами этого упражнения, сек
}

/** Тренировочная сессия (день плана), например «Грудь + трицепс» */
export interface Session {
  id: string;
  name: string;
  exercises: PlanExercise[];
  restSets?: number; // устарело: раньше отдых был общим на тренировку, теперь он у каждого упражнения
  restExercises: number; // отдых между упражнениями, сек
  generated?: string; // из какого шаблона сплита создана
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface RestRecord {
  kind: 'set' | 'exercise';
  planned: number; // сек
  actual: number; // сек
}

/** Состояние прогрессии упражнения после очередной тренировки */
export interface ProgressState {
  weight: number; // вес, к которому относится состояние
  successStreak: number;
  failStreak: number;
  rebuildTarget: number | null; // вес, к которому идёт разгон после отката
  resetCount: number; // сколько раз откатывались с rebuildTarget
}

export type RecoAction = 'increase' | 'hold' | 'decrease' | 'reset' | 'break' | 'stall' | 'reps';

export interface Recommendation {
  action: RecoAction;
  nextWeight: number;
  nextReps: number;
  ladder?: number[]; // план разгона после отката
  messages: string[];
  state: ProgressState;
}

export interface WorkoutEntry {
  uid: string;
  exerciseId: string;
  plannedSets: number;
  reps: number;
  weight: number;
  step: number;
  completedSets: number | null; // null — упражнение пропущено
  setReps?: number[]; // фактические повторы в каждом подходе
  setWeights?: number[]; // фактический вес в каждом подходе
  rest?: number; // плановый отдых между подходами, сек
  rests: RestRecord[]; // отдых между подходами этого упражнения
  startedAt: number;
  finishedAt: number | null;
  reco?: Recommendation;
}

export interface WorkoutLog {
  id: string;
  sessionId: string;
  sessionName: string;
  startedAt: number;
  finishedAt: number | null;
  entries: WorkoutEntry[];
  exerciseRests: RestRecord[]; // отдых между упражнениями
  applied?: boolean; // рекомендации перенесены в план
  cursor: WorkoutCursor;
}

/** Где пользователь находится в тренировке — сохраняется, чтобы пережить закрытие приложения */
export interface WorkoutCursor {
  index: number; // текущее упражнение
  setsDone: number; // отмечено подходов в текущем упражнении
  phase: 'exercise' | 'restSet' | 'restExercise';
  restStartedAt: number | null;
  restPlanned: number;
}

export type ThemeSetting = 'system' | 'light' | 'dark';
export type Lang = 'ru' | 'en';

export interface Settings {
  theme: ThemeSetting;
  lang: Lang;
  consentAt: number | null;
  sound: boolean;
  botReminders: boolean; // напоминания об отдыхе в чат бота, когда приложение свёрнуто
}
