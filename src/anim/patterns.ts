// Собственные анимации упражнений. Каждое движение — две позы (A и B), между которыми
// фигурка плавно двигается. Поза описана точками в системе координат 100×100:
// h — голова, n — шея/плечи, p — таз, e/w — локоть/кисть, k/a — колено/лодыжка, t — носок.
// e2/w2/k2/a2/t2 — дальние рука и нога (если двигаются иначе, чем ближние).
// view 'side' — вид сбоку (лицом вправо), 'front' — вид спереди (точки левой половины, правая зеркалится).

export type Pt = [number, number];
export type Pose = Partial<Record<'h' | 'n' | 'p' | 'e' | 'w' | 'k' | 'a' | 't' | 'e2' | 'w2' | 'k2' | 'a2' | 't2', Pt>>;

export type Attach = 'hands' | 'neck' | 'platform' | 'pad' | 'knee' | 'ankle2';

export interface Pattern {
  view: 'side' | 'front';
  A: Pose;
  B: Pose;
  attach?: Attach; // куда крепится снаряд (по умолчанию — к кистям)
  anchor?: Pt; // точка крепления троса для блочных упражнений
  bar?: boolean; // во фронтальном виде — общая рукоять/гриф между кистями
  scene?: string; // неподвижное оборудование (path d)
}

function P(s: string): Pose {
  const t = s.trim().split(/\s+/);
  const pose: Pose = {};
  for (let i = 0; i < t.length; i += 3) pose[t[i] as keyof Pose] = [Number(t[i + 1]), Number(t[i + 2])];
  return pose;
}
const merge = (base: string, extra: string) => ({ ...P(base), ...P(extra) });

// Часто повторяющиеся тела
const STAND = 'h 50 14 n 50 22 p 50 48 k 50 70 a 50 90';
const FRONT = 'h 50 14 n 50 22 p 50 48 k 46 70 a 45 90';
const LYING = 'h 21 64 n 29 67 p 54 68 k 68 70 a 72 90';
const BENT = 'h 75 38 n 68 41 p 44 52 k 55 72 a 50 90';
const BENCH = 'M16 72 H74 M22 72 V91 M68 72 V91';

const fly: Pattern = {
  view: 'front',
  scene: 'M43 10 H57 V60 H43 Z',
  A: merge(FRONT, 'e 29 25 w 15 27'),
  B: merge(FRONT, 'e 37 30 w 47 32'),
};
const abduction: Pattern = {
  view: 'front',
  attach: 'knee',
  scene: 'M34 62 H66 M50 62 V91',
  A: P('h 50 26 n 50 34 p 50 60 e 40 48 w 38 60 k 45 66 a 45 88'),
  B: P('h 50 26 n 50 34 p 50 60 e 40 48 w 38 60 k 32 66 a 30 88'),
};
const legPressBody = 'h 19 39 n 23 47 p 37 72 e 33 62 w 39 70';

export const PATTERNS: Record<string, Pattern> = {
  // ГРУДЬ
  bench_press: { view: 'side', scene: BENCH, A: merge(LYING, 'e 36 76 w 37 60'), B: merge(LYING, 'e 30 52 w 31 38') },
  incline_press: {
    view: 'side',
    scene: 'M56 74 L20 50 M56 74 H70 M30 70 V91 M60 74 V91',
    A: P('h 26 51 n 32 57 p 52 72 k 66 70 a 70 90 e 38 66 w 40 52'),
    B: P('h 26 51 n 32 57 p 52 72 k 66 70 a 70 90 e 35 44 w 37 31'),
  },
  chest_press: {
    view: 'side',
    scene: 'M30 68 H54 M34 68 V91 M30 68 L28 28',
    A: P('h 36 30 n 35 38 p 37 66 k 56 66 a 58 90 e 28 46 w 42 44'),
    B: P('h 36 30 n 35 38 p 37 66 k 56 66 a 58 90 e 48 40 w 62 40'),
  },
  fly,
  reverse_fly: { ...fly, A: fly.B, B: fly.A },
  crossover: { view: 'front', anchor: [6, 4], A: merge(FRONT, 'e 31 18 w 18 10'), B: merge(FRONT, 'e 40 38 w 48 48') },
  crossover_low: { view: 'front', anchor: [6, 90], A: merge(FRONT, 'e 32 34 w 20 46'), B: merge(FRONT, 'e 39 24 w 48 16') },
  pushup: {
    view: 'side',
    A: P('h 21 74 n 29 76 p 54 80 k 70 84 a 86 88 t 88 92 e 41 80 w 31 91'),
    B: P('h 23 59 n 31 62 p 56 73 k 71 81 a 86 88 t 88 92 e 32 76 w 31 91'),
  },
  pullover: { view: 'side', scene: BENCH, A: merge(LYING, 'e 14 64 w 2 62'), B: merge(LYING, 'e 30 52 w 31 39') },
  dip: {
    view: 'side',
    scene: 'M36 50 H64 M60 50 V91',
    A: P('h 50 18 n 50 26 p 50 52 k 54 66 a 44 72 e 50 38 w 50 50'),
    B: P('h 52 32 n 51 40 p 49 64 k 53 80 a 43 84 e 39 44 w 50 50'),
  },

  // СПИНА
  pullup: {
    view: 'front',
    scene: 'M14 8 H86',
    A: P('h 50 26 n 50 33 p 50 58 k 48 74 a 48 88 e 38 21 w 34 8'),
    B: P('h 50 6 n 50 15 p 50 40 k 48 56 a 48 70 e 33 20 w 34 8'),
  },
  pulldown: {
    view: 'front',
    bar: true,
    anchor: [50, 0],
    scene: 'M36 66 H64 M50 66 V91',
    A: P('h 50 30 n 50 38 p 50 64 k 41 68 a 40 90 e 37 25 w 32 12'),
    B: P('h 50 30 n 50 38 p 50 64 k 41 68 a 40 90 e 32 50 w 37 38'),
  },
  row_cable: {
    view: 'side',
    anchor: [94, 76],
    scene: 'M26 80 H52 M34 80 V91 M78 72 V91',
    A: P('h 49 47 n 46 55 p 40 78 k 58 70 a 74 84 e 58 61 w 72 64'),
    B: P('h 42 46 n 42 54 p 40 78 k 58 70 a 74 84 e 30 62 w 44 66'),
  },
  row_bent: { view: 'side', A: merge(BENT, 'e 68 55 w 68 69'), B: merge(BENT, 'e 58 36 w 60 50') },
  straight_pulldown: {
    view: 'side',
    anchor: [80, 0],
    A: P('h 52 16 n 51 24 p 48 50 k 51 70 a 50 90 e 61 13 w 72 5'),
    B: P('h 52 16 n 51 24 p 48 50 k 51 70 a 50 90 e 54 38 w 55 52'),
  },
  deadlift: {
    view: 'side',
    A: P('h 66 42 n 60 47 p 39 63 k 57 76 a 50 90 e 59 62 w 58 77'),
    B: P('h 50 14 n 50 22 p 48 48 k 50 70 a 50 90 e 51 37 w 51 51'),
  },
  rdl: {
    view: 'side',
    A: P('h 50 14 n 50 22 p 48 48 k 50 70 a 50 90 e 51 37 w 51 51'),
    B: P('h 68 37 n 61 41 p 40 50 k 52 70 a 50 90 e 61 55 w 61 68'),
  },
  hyperext: {
    view: 'side',
    scene: 'M48 60 L62 66 M60 65 L58 91 M80 76 L88 72 M86 73 V91',
    A: P('p 55 56 k 70 64 a 84 72 n 44 80 h 41 87 e 49 74 w 46 70'),
    B: P('p 55 56 k 70 64 a 84 72 n 32 44 h 25 40 e 40 52 w 36 48'),
  },
  good_morning: {
    view: 'side',
    attach: 'neck',
    A: P('h 48 14 n 48 22 p 48 48 k 50 70 a 48 90 e 40 32 w 45 23'),
    B: P('h 68 39 n 61 43 p 40 50 k 52 70 a 50 90 e 53 50 w 58 44'),
  },
  shrug: {
    view: 'front',
    A: P('h 50 14 n 50 22 p 50 48 k 46 70 a 45 90 e 42 37 w 41 50'),
    B: P('h 50 13 n 50 18 p 50 48 k 46 70 a 45 90 e 42 33 w 41 46'),
  },

  // ПЛЕЧИ
  press_overhead: {
    view: 'front',
    bar: true,
    A: P('h 50 22 n 50 30 p 50 56 k 47 74 a 46 90 e 38 40 w 40 29'),
    B: P('h 50 22 n 50 30 p 50 56 k 47 74 a 46 90 e 40 18 w 41 6'),
  },
  press_overhead_seated: {
    view: 'front',
    scene: 'M34 62 H66 M50 62 V91',
    A: P('h 50 26 n 50 34 p 50 60 k 41 68 a 40 90 e 38 44 w 40 33'),
    B: P('h 50 26 n 50 34 p 50 60 k 41 68 a 40 90 e 40 22 w 41 10'),
  },
  lateral_raise: { view: 'front', A: merge(FRONT, 'e 41 36 w 40 50'), B: merge(FRONT, 'e 32 25 w 19 25') },
  front_raise: { view: 'side', anchor: [44, 92], A: merge(STAND, 'e 51 37 w 52 51'), B: merge(STAND, 'e 64 23 w 78 22') },
  bent_raise: { view: 'side', A: merge(BENT, 'e 69 55 w 70 68'), B: merge(BENT, 'e 70 36 w 72 29') },
  face_pull: { view: 'side', anchor: [96, 20], A: merge(STAND, 'e 63 25 w 76 22'), B: merge(STAND, 'e 44 18 w 56 15') },
  upright_row: { view: 'front', bar: true, A: merge(FRONT, 'e 44 37 w 47 50'), B: merge(FRONT, 'e 33 22 w 45 26') },

  // РУКИ
  curl: { view: 'side', anchor: [58, 92], A: merge(STAND, 'e 50 37 w 51 51'), B: merge(STAND, 'e 51 37 w 57 24') },
  curl_preacher: {
    view: 'side',
    scene: 'M50 44 L68 58 L68 64 M64 62 V91 M28 66 H50 M38 66 V91',
    A: P('h 46 30 n 45 38 p 42 66 k 60 66 a 60 90 e 61 52 w 72 64'),
    B: P('h 46 30 n 45 38 p 42 66 k 60 66 a 60 90 e 61 52 w 56 38'),
  },
  pushdown: { view: 'side', anchor: [60, 0], A: merge(STAND, 'e 51 37 w 63 31'), B: merge(STAND, 'e 51 37 w 54 51') },
  tri_overhead: {
    view: 'side',
    anchor: [28, 44],
    A: P('h 50 24 n 50 32 p 50 58 k 50 75 a 50 90 e 53 17 w 44 28'),
    B: P('h 50 24 n 50 32 p 50 58 k 50 75 a 50 90 e 53 17 w 55 3'),
  },
  skullcrusher: { view: 'side', scene: BENCH, A: merge(LYING, 'e 33 52 w 23 59'), B: merge(LYING, 'e 33 52 w 34 38') },
  kickback: { view: 'side', A: merge(BENT, 'e 57 46 w 58 60'), B: merge(BENT, 'e 57 46 w 44 47') },
  wrist_curl: {
    view: 'side',
    scene: 'M28 66 H50 M32 66 V91',
    A: P('h 56 34 n 52 42 p 40 64 k 60 64 a 60 90 e 50 61 w 67 64'),
    B: P('h 56 34 n 52 42 p 40 64 k 60 64 a 60 90 e 50 61 w 66 57'),
  },

  // НОГИ
  squat_back: {
    view: 'side',
    attach: 'neck',
    A: P('h 48 14 n 48 22 p 48 48 k 50 70 a 48 90 e 40 32 w 45 23'),
    B: P('h 55 36 n 52 43 p 41 67 k 60 74 a 48 90 e 45 51 w 50 44'),
  },
  squat_front: {
    view: 'side',
    A: P('h 48 14 n 48 22 p 48 48 k 50 70 a 48 90 e 52 34 w 56 28'),
    B: P('h 55 36 n 52 43 p 41 67 k 60 74 a 48 90 e 58 52 w 61 45'),
  },
  squat_hold: {
    view: 'side',
    A: P('h 48 14 n 48 22 p 48 48 k 50 70 a 48 90 e 48 37 w 48 51'),
    B: P('h 55 36 n 52 43 p 41 67 k 60 74 a 48 90 e 52 57 w 52 70'),
  },
  leg_press: {
    view: 'side',
    attach: 'platform',
    scene: 'M40 74 L18 40 M40 74 L44 91 M20 80 H46',
    A: merge(legPressBody, 'k 46 50 a 60 58'),
    B: merge(legPressBody, 'k 52 59 a 68 46'),
  },
  calf_press: {
    view: 'side',
    attach: 'platform',
    scene: 'M40 74 L18 40 M40 74 L44 91 M20 80 H46',
    A: merge(legPressBody, 'k 52 59 a 68 46 t 73 41'),
    B: merge(legPressBody, 'k 52 59 a 68 46 t 75 45'),
  },
  leg_ext: {
    view: 'side',
    attach: 'pad',
    scene: 'M36 70 H64 M40 70 V91 M36 70 L34 30',
    A: P('h 42 32 n 41 40 p 44 66 k 64 66 e 43 55 w 48 66 a 66 88'),
    B: P('h 42 32 n 41 40 p 44 66 k 64 66 e 43 55 w 48 66 a 83 60'),
  },
  leg_curl_lying: {
    view: 'side',
    attach: 'pad',
    scene: 'M14 62 H70 M20 62 V91 M64 62 V91',
    A: P('h 17 54 n 25 56 p 48 57 k 68 57 e 26 65 w 20 62 a 86 58'),
    B: P('h 17 54 n 25 56 p 48 57 k 68 57 e 26 65 w 20 62 a 76 40'),
  },
  leg_curl_seated: {
    view: 'side',
    attach: 'pad',
    scene: 'M34 68 H62 M38 68 V91 M34 68 L32 30',
    A: P('h 38 30 n 38 38 p 40 64 k 60 64 e 40 52 w 46 62 a 79 62'),
    B: P('h 38 30 n 38 38 p 40 64 k 60 64 e 40 52 w 46 62 a 60 85'),
  },
  lunge: {
    view: 'side',
    A: P('h 50 18 n 50 26 p 50 52 k 61 70 a 63 90 e 50 41 w 50 55 k2 42 71 a2 32 88 t2 37 92'),
    B: P('h 50 30 n 50 38 p 50 64 k 64 66 a 64 90 e 50 53 w 50 67 k2 40 85 a2 30 89 t2 36 92'),
  },
  lunge_bar: {
    view: 'side',
    attach: 'neck',
    A: P('h 50 18 n 50 26 p 50 52 k 61 70 a 63 90 e 43 34 w 47 27 k2 42 71 a2 32 88 t2 37 92'),
    B: P('h 50 30 n 50 38 p 50 64 k 64 66 a 64 90 e 43 46 w 47 39 k2 40 85 a2 30 89 t2 36 92'),
  },
  hip_thrust: {
    view: 'side',
    scene: 'M8 66 H30 M12 66 V91 M26 66 V91',
    A: P('h 22 58 n 30 63 p 46 80 k 62 66 a 66 90 e 38 74 w 46 77'),
    B: P('h 22 57 n 30 62 p 50 62 k 66 62 a 66 90 e 40 66 w 50 60'),
  },
  glute_bridge: {
    view: 'side',
    A: P('h 16 86 n 24 87 p 44 88 k 60 72 a 66 90 e 34 88 w 44 85'),
    B: P('h 16 86 n 24 87 p 46 76 k 62 70 a 66 90 e 35 80 w 46 73'),
  },
  kickback_leg: {
    view: 'side',
    attach: 'ankle2',
    anchor: [64, 92],
    scene: 'M72 30 V91',
    A: P('h 60 18 n 57 25 p 50 50 k 52 70 a 50 90 e 64 34 w 71 40 k2 46 70 a2 42 90'),
    B: P('h 60 18 n 57 25 p 50 50 k 52 70 a 50 90 e 64 34 w 71 40 k2 38 64 a2 26 72'),
  },
  swing: {
    view: 'side',
    anchor: [8, 90],
    A: P('h 68 40 n 62 44 p 40 56 k 55 73 a 50 90 e 56 58 w 48 70'),
    B: P('h 50 14 n 50 22 p 48 48 k 50 70 a 50 90 e 62 27 w 75 27'),
  },
  abduction,
  adduction: { ...abduction, A: abduction.B, B: abduction.A },
  calf_raise: {
    view: 'side',
    A: P('h 50 14 n 50 22 p 50 48 e 50 37 w 50 51 k 50 70 a 50 90 t 57 91'),
    B: P('h 50 9 n 50 17 p 50 43 e 50 32 w 50 46 k 50 65 a 50 85 t 57 91'),
  },
  calf_seated: {
    view: 'side',
    attach: 'knee',
    scene: 'M28 64 H50 M32 64 V91',
    A: P('h 34 30 n 34 38 p 36 62 e 44 50 w 56 58 k 58 62 a 59 85 t 66 86'),
    B: P('h 34 30 n 34 38 p 36 62 e 44 50 w 56 58 k 58 58 a 59 80 t 66 86'),
  },

  // ПРЕСС
  crunch: {
    view: 'side',
    A: P('h 18 84 n 26 86 p 50 86 k 62 72 a 72 90 e 24 78 w 20 82'),
    B: P('h 31 68 n 35 74 p 50 86 k 62 72 a 72 90 e 36 64 w 30 66'),
  },
  cable_crunch: {
    view: 'side',
    anchor: [56, 0],
    A: P('h 58 32 n 57 40 p 58 66 k 60 90 a 80 90 t 84 90 e 62 35 w 59 30'),
    B: P('h 80 66 n 74 62 p 58 68 k 60 90 a 80 90 t 84 90 e 76 52 w 80 57'),
  },
  leg_raise_hanging: {
    view: 'side',
    scene: 'M30 8 H70',
    A: P('h 55 24 n 50 28 p 50 54 k 50 72 a 50 88 e 50 18 w 50 8'),
    B: P('h 55 24 n 50 28 p 50 54 k 68 54 a 86 54 e 50 18 w 50 8'),
  },
  leg_raise_lying: {
    view: 'side',
    A: P('h 16 84 n 24 86 p 48 86 k 66 87 a 84 88 e 34 90 w 42 90'),
    B: P('h 16 84 n 24 86 p 48 86 k 55 69 a 60 52 e 34 90 w 42 90'),
  },
  plank: {
    view: 'side',
    A: P('h 23 72 n 30 75 p 54 80 k 70 85 a 86 88 t 88 92 e 31 90 w 22 90'),
    B: P('h 23 71 n 30 74 p 54 77 k 70 84 a 86 88 t 88 92 e 31 90 w 22 90'),
  },
};
