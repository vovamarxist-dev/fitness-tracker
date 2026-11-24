// Рекомендованный шаг рабочего веса и отдых по умолчанию для каждого упражнения каталога.
// Логика и источники — docs/weight-steps.md. Значения — отправная точка: в плане их можно поменять.

// Тяжёлая база ног и спины: большой мышечный объём, растёт быстрее всего, нужен долгий отдых
const HEAVY_LOWER = new Set(['squat_back', 'squat_deep', 'deadlift', 'deadlift_sumo', 'rack_pull', 'squat_fv']);
// Базовые для ног/таза со штангой, но технически сложнее или односторонние — шаг меньше
const LOWER_BAR_SMALL = new Set(['squat_front', 'lunge', 'lunge_step', 'lunge_back', 'lunge_bulg', 'stepup', 'good_morning', 'squat_hold']);
const LOWER_BAR_BIG = new Set(['rdl', 'sldl', 'hip_thrust', 'glute_bridge', 'glute_bridge_1', 'calf_raise']);
// Изоляция, где даже 2 кг на гантель — это +20–30% веса
const DB_TINY = new Set(['lateral_raise', 'bent_raise', 'bent_raise_seated', 'front_raise', 'kickback', 'wrist_curl', 'wrist_curl_rev', 'fly', 'fly_side']);
// Блочная и тренажёрная изоляция малых мышц
const SMALL_ISO = new Set([
  'curl', 'curl_f', 'curl_cross', 'curl_drag', 'curl_incline', 'curl_conc', 'curl_spider', 'curl_preacher', 'curl_machine',
  'pushdown', 'pushdown_f', 'tri_overhead', 'skullcrusher', 'skull_behind', 'kickback',
  'lateral_raise', 'front_raise', 'bent_raise', 'bent_raise_seated', 'reverse_fly', 'face_pull', 'fly', 'fly_side',
  'crossover', 'crossover_low', 'straight_pulldown', 'straight_pulldown_rope', 'wrist_curl', 'wrist_curl_rev', 'upright_row',
]);
const CORE = new Set(['crunch', 'cable_crunch', 'situp', 'twist', 'rev_crunch', 'leg_raise_hanging', 'leg_raise_lying']);

// Упражнения с собственным весом: прогрессия повторами, потом отягощение или усложнение
const BODY = {
  pullup: { cap: 12, capNote: 'После 12 чистых повторов во всех подходах — вешай 2,5 кг на пояс.', rest: 120 },
  dip: { cap: 15, capNote: 'После 15 повторов во всех подходах — вешай 2,5–5 кг на пояс.', rest: 120 },
  dip_chest: { cap: 15, capNote: 'После 15 повторов во всех подходах — вешай 2,5–5 кг на пояс.', rest: 120 },
  bench_dip: { cap: 20, capNote: 'После 20 повторов — положи блин 5–10 кг на бёдра.', rest: 90 },
  pushup: { cap: 25, capNote: 'После 25 повторов — переходи на отжимания с ногами на возвышении или с жилетом.', rest: 90 },
  pushup_front: { cap: 25, capNote: 'После 25 повторов — усложни вариант или надень жилет.', rest: 90 },
  pushup_elev: { cap: 25, capNote: 'После 25 повторов — добавь жилет или блин на спину.', rest: 90 },
  pushup_incline: { cap: 25, capNote: 'После 25 повторов — переходи на отжимания от пола.', rest: 75 },
  squat_hold: { cap: 25, capNote: 'После 25 повторов — бери гантели.', rest: 90 },
  glute_bridge: { cap: 20, capNote: 'После 20 повторов — переходи на мостик на одной ноге или со штангой.', rest: 75 },
  glute_bridge_1: { cap: 15, capNote: 'После 15 повторов на каждую ногу — положи блин на таз.', rest: 75 },
  kickback_leg: { cap: 20, capNote: 'После 20 повторов — переходи на блок или утяжелители.', rest: 60 },
  plank: { cap: 120, repStep: 10, capNote: 'Повторы здесь — секунды. После 2 минут — усложни: подними ногу или руку.', rest: 60 },
  side_plank: { cap: 90, repStep: 10, capNote: 'Повторы здесь — секунды на сторону. После 90 секунд — подними верхнюю ногу.', rest: 60 },
  leg_raise_hanging: { cap: 15, capNote: 'После 15 повторов — поднимай прямые ноги или зажми гантель стопами.', rest: 75 },
  leg_raise_lying: { cap: 20, capNote: 'После 20 повторов — переходи на подъём ног в висе.', rest: 60 },
  rev_crunch: { cap: 20, capNote: 'После 20 повторов — делай на наклонной скамье головой вверх.', rest: 60 },
  crunch: { cap: 25, capNote: 'После 25 повторов — возьми блин к груди.', rest: 60 },
  situp: { cap: 25, capNote: 'После 25 повторов — возьми блин к груди.', rest: 60 },
  twist: { cap: 30, capNote: 'После 30 повторов — возьми блин или гантель.', rest: 60 },
  rollout: { cap: 15, capNote: 'После 15 повторов — выкатывайся дальше или переходи на ролик стоя.', rest: 75 },
};

const round15 = (s) => Math.round(s / 15) * 15;

export function loadingFor({ id, anim, equipment }) {
  const base = anim.split('+')[0];

  // Особые случаи
  if (id === 'x_assisted_pullup') {
    return {
      step: 0, rest: 120, repCap: 12, repStep: 1,
      stepNote: 'Вес в гравитроне — противовес. Прогресс — добавлять повторы, потом уменьшать противовес.',
      capNote: 'После 12 повторов во всех подходах — уменьши противовес на 5 кг.',
    };
  }
  if (id === 'x_captains_chair') return { step: 0, rest: 75, repCap: 15, repStep: 1, stepNote: 'Прогресс повторами.', capNote: 'После 15 повторов — зажми гантель стопами.' };
  if (id === 'Barbell_Ab_Rollout_-_On_Knees') return { step: 0, rest: 75, repCap: 15, repStep: 1, stepNote: 'Прогресс повторами и амплитудой.', capNote: BODY.rollout.capNote };

  if (equipment === 'body') {
    const b = BODY[base] ?? { cap: 20, capNote: 'После 20 повторов во всех подходах — добавь отягощение.', rest: 75 };
    return { step: 0, rest: b.rest, repCap: b.cap, repStep: b.repStep ?? 1, stepNote: 'Свой вес: прибавляем повторы.', capNote: b.capNote };
  }

  let step;
  let note;
  let rest;
  const iso = SMALL_ISO.has(base);

  switch (equipment) {
    case 'barbell':
    case 'smith':
    case 'ezbar':
      if (HEAVY_LOWER.has(base)) {
        step = 5; rest = 180;
        note = 'Тяжёлая база ног и спины: самые сильные мышцы, вес растёт быстрее всего. Когда +5 кг перестанут заходить — переходи на +2,5.';
      } else if (LOWER_BAR_BIG.has(base)) {
        step = 5; rest = 150;
        note = 'Большие мышцы задней поверхности и ягодиц, короткая амплитуда — шаг 5 кг.';
      } else if (LOWER_BAR_SMALL.has(base)) {
        step = 2.5; rest = 150;
        note = 'Ноги, но упражнение техничное или на одну ногу — шаг 2,5 кг, чтобы не ломать технику.';
      } else if (base === 'shrug') {
        step = 5; rest = 90;
        note = 'Трапеции сильные и работают в короткой амплитуде — шаг 5 кг.';
      } else if (iso) {
        step = 2.5; rest = 75;
        note = 'Изоляция малых мышц. 2,5 кг — минимальный шаг на штанге (по 1,25 кг с каждой стороны).';
      } else if (base === 'press_overhead' || base === 'press_overhead_seated' || base === 'press_neck') {
        step = 2.5; rest = 150;
        note = 'Жим над головой растёт медленнее жима лёжа. Если 2,5 кг не заходят — бери мини-блины по 0,5–1 кг.';
      } else {
        step = 2.5; rest = 150;
        note = 'Базовое упражнение верха тела — шаг 2,5 кг (по 1,25 кг с каждой стороны).';
      }
      if (equipment === 'smith') note += ' В Смите гриф часто легче олимпийского — учитывай при переносе веса.';
      break;

    case 'dumbbell':
      if (DB_TINY.has(base)) {
        step = 1; rest = 60;
        note = 'Малые мышцы: +2 кг на гантель — это +20–30% веса. Бери шаг 1 кг; если в зале гантели идут через 2 кг, сначала добирай повторы.';
      } else if (iso) {
        step = 2; rest = 75;
        note = 'Изоляция: шаг гантельного ряда — 2 кг. Не идёт — сначала добавь 1–2 повтора.';
      } else if (['lunge', 'lunge_step', 'lunge_back', 'lunge_bulg', 'stepup', 'squat_hold', 'squat_fv', 'rdl', 'shrug', 'calf_raise'].includes(base)) {
        step = 2; rest = 120;
        note = 'Ноги с гантелями: шаг 2 кг на каждую гантель (+4 кг в сумме).';
      } else {
        step = 2; rest = 120;
        note = 'Жимы и тяги гантелями: шаг 2 кг на гантель — стандартный шаг гантельного ряда.';
      }
      break;

    case 'kettlebell':
      step = 4; rest = 90;
      note = 'Гири идут через 4 кг (16 → 20 → 24). Пока следующая не заходит — добавляй повторы.';
      break;

    case 'cable':
      if (iso) {
        step = 2.5; rest = 60;
        note = 'Блок, малые мышцы: шаг 2,5 кг. Если стек идёт через 5 кг — используй довесок или добирай повторы.';
      } else {
        step = 5; rest = 120;
        note = 'Тяги и жимы на блоке: одна плитка стека — 5 кг.';
      }
      if (CORE.has(base)) { step = 5; rest = 60; note = 'Пресс на блоке: шаг 5 кг, рабочий диапазон 12–20 повторов.'; }
      break;

    case 'machine':
    default:
      if (base === 'leg_press' || base === 'leg_press_low') {
        step = 10; rest = 150;
        note = 'Жим ногами: по 5 кг с каждой стороны. Ноги здесь очень сильные — шаг 10 кг нормален.';
      } else if (base === 'squat_back' || base === 'squat_hold') {
        step = 10; rest = 150;
        note = 'Гакк-машина: по 5 кг с каждой стороны.';
      } else if (base === 'calf_raise' || base === 'calf_seated' || base === 'calf_press') {
        step = 5; rest = 60;
        note = 'Икры: шаг 5 кг, рабочий диапазон 12–20 повторов.';
      } else if (['leg_ext', 'leg_curl_lying', 'leg_curl_seated', 'abduction', 'adduction', 'hip_thrust', 'hyperext', 'ghr'].includes(base)) {
        step = 5; rest = 90;
        note = base === 'hyperext' || base === 'ghr' ? 'Блин в руках у груди: начинай с 2,5–5 кг, шаг 5 кг.' : 'Тренажёр для ног: шаг — одна плитка стека, 5 кг.';
        if (base === 'hyperext' || base === 'ghr') step = 2.5;
      } else if (iso || CORE.has(base)) {
        step = 2.5; rest = 60;
        note = 'Изоляция в тренажёре: шаг 2,5 кг (половина плитки или довесок). Нет довеска — добирай повторы.';
      } else {
        step = 5; rest = 120;
        note = 'Базовый тренажёр: шаг — одна плитка стека или по 2,5 кг на каждую сторону, 5 кг.';
      }
      break;
  }
  return { step, rest: round15(rest), stepNote: note };
}
