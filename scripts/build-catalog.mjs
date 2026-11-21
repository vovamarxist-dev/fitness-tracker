// Собирает каталог упражнений: src/data/catalog.json.
// Источник метаданных (мышцы, оборудование, тип): free-exercise-db (Unlicense, общественное достояние),
// https://github.com/yuhonas/free-exercise-db. Фото из базы не используются: у каждого
// упражнения своя анимация (src/anim/patterns.ts), имя анимации задаётся третьим полем строки.
// Запуск: npm run catalog
import { readFileSync, writeFileSync } from 'node:fs';

const src = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const byId = new Map(src.map((e) => [e.id, e]));

// id | русское название | анимация
const LIST = `
Barbell_Bench_Press_-_Medium_Grip|Жим штанги лёжа|bench_press
Wide-Grip_Barbell_Bench_Press|Жим штанги лёжа широким хватом|bench_press
Barbell_Incline_Bench_Press_-_Medium_Grip|Жим штанги на наклонной скамье|incline_press
Decline_Barbell_Bench_Press|Жим штанги лёжа головой вниз|bench_press
Dumbbell_Bench_Press|Жим гантелей лёжа|bench_press
Dumbbell_Bench_Press_with_Neutral_Grip|Жим гантелей лёжа нейтральным хватом|bench_press
Incline_Dumbbell_Press|Жим гантелей на наклонной скамье|incline_press
Hammer_Grip_Incline_DB_Bench_Press|Жим гантелей на наклонной нейтральным хватом|incline_press
Decline_Dumbbell_Bench_Press|Жим гантелей лёжа головой вниз|bench_press
Smith_Machine_Bench_Press|Жим лёжа в Смите|bench_press
Smith_Machine_Incline_Bench_Press|Жим в Смите на наклонной скамье|incline_press
Machine_Bench_Press|Жим от груди в тренажёре|chest_press
Leverage_Chest_Press|Жим от груди в рычажном тренажёре|chest_press
Leverage_Incline_Chest_Press|Жим в рычажном тренажёре под углом вверх|chest_press
Cable_Chest_Press|Жим от груди в кроссовере|chest_press
Dumbbell_Flyes|Разводка гантелей лёжа|fly
Incline_Dumbbell_Flyes|Разводка гантелей на наклонной скамье|fly
Decline_Dumbbell_Flyes|Разводка гантелей головой вниз|fly
Butterfly|Сведение рук в тренажёре «бабочка»|fly
Flat_Bench_Cable_Flyes|Разводка с нижних блоков лёжа|fly
Incline_Cable_Flye|Разводка с нижних блоков на наклонной|fly
Cable_Crossover|Сведение рук в кроссовере сверху вниз|crossover
Low_Cable_Crossover|Сведение рук в кроссовере снизу вверх|crossover_low
Pushups|Отжимания от пола|pushup
Push-Up_Wide|Отжимания широкой постановкой рук|pushup
Push-Ups_With_Feet_Elevated|Отжимания с ногами на возвышении|pushup
Incline_Push-Up|Отжимания с упором на скамью|pushup
Straight-Arm_Dumbbell_Pullover|Пуловер с гантелью|pullover
Bent-Arm_Barbell_Pullover|Пуловер со штангой|pullover
x_dips_chest|Отжимания на брусьях (акцент на грудь)|dip
Pullups|Подтягивания широким хватом|pullup
Chin-Up|Подтягивания обратным хватом|pullup
V-Bar_Pullup|Подтягивания с V-рукоятью|pullup
x_assisted_pullup|Подтягивания в гравитроне|pullup
Wide-Grip_Lat_Pulldown|Тяга верхнего блока широким хватом|pulldown
Close-Grip_Front_Lat_Pulldown|Тяга верхнего блока узким хватом|pulldown
Underhand_Cable_Pulldowns|Тяга верхнего блока обратным хватом|pulldown
V-Bar_Pulldown|Тяга верхнего блока с V-рукоятью|pulldown
Wide-Grip_Pulldown_Behind_The_Neck|Тяга верхнего блока за голову|pulldown
One_Arm_Lat_Pulldown|Тяга верхнего блока одной рукой|pulldown
Leverage_High_Row|Тяга сверху в рычажном тренажёре|pulldown
Seated_Cable_Rows|Тяга нижнего блока к поясу|row_cable
Seated_One-arm_Cable_Pulley_Rows|Тяга нижнего блока одной рукой|row_cable
Leverage_Iso_Row|Горизонтальная тяга в рычажном тренажёре|row_cable
Bent_Over_Barbell_Row|Тяга штанги в наклоне|row_bent
Reverse_Grip_Bent-Over_Rows|Тяга штанги в наклоне обратным хватом|row_bent
One-Arm_Dumbbell_Row|Тяга гантели одной рукой в наклоне|row_bent
Bent_Over_Two-Dumbbell_Row|Тяга гантелей в наклоне|row_bent
Dumbbell_Incline_Row|Тяга гантелей лёжа на наклонной скамье|row_bent
T-Bar_Row_with_Handle|Тяга Т-грифа в наклоне|row_bent
Lying_T-Bar_Row|Тяга Т-грифа с упором грудью|row_bent
Smith_Machine_Bent_Over_Row|Тяга в наклоне в Смите|row_bent
Straight-Arm_Pulldown|Пуловер на верхнем блоке прямыми руками|straight_pulldown
Rope_Straight-Arm_Pulldown|Пуловер на верхнем блоке с канатом|straight_pulldown
Barbell_Deadlift|Становая тяга|deadlift
Sumo_Deadlift|Становая тяга сумо|deadlift
Deficit_Deadlift|Становая тяга с дефицитом|deadlift
Rack_Pulls|Тяга с плинтов|rdl
x_hyperextension|Гиперэкстензия|hyperext
Good_Morning|Наклоны со штангой на плечах («гуд морнинг»)|good_morning
Barbell_Shrug|Шраги со штангой|shrug
Dumbbell_Shrug|Шраги с гантелями|shrug
Smith_Machine_Behind_the_Back_Shrug|Шраги в Смите|shrug
Cable_Shrugs|Шраги на нижнем блоке|shrug
Leverage_Shrug|Шраги в тренажёре|shrug
Standing_Military_Press|Армейский жим стоя|press_overhead
Seated_Barbell_Military_Press|Жим штанги сидя|press_overhead_seated
Standing_Barbell_Press_Behind_Neck|Жим штанги из-за головы|press_overhead
Dumbbell_Shoulder_Press|Жим гантелей сидя|press_overhead_seated
Standing_Dumbbell_Press|Жим гантелей стоя|press_overhead
Arnold_Dumbbell_Press|Жим Арнольда|press_overhead_seated
Machine_Shoulder_Military_Press|Жим вверх в тренажёре|press_overhead_seated
Leverage_Shoulder_Press|Жим на плечи в рычажном тренажёре|press_overhead_seated
Smith_Machine_Overhead_Shoulder_Press|Жим сидя в Смите|press_overhead_seated
Seated_Cable_Shoulder_Press|Жим на плечи в кроссовере сидя|press_overhead_seated
Side_Lateral_Raise|Махи гантелями в стороны|lateral_raise
Seated_Side_Lateral_Raise|Махи гантелями в стороны сидя|lateral_raise
One-Arm_Side_Laterals|Махи в сторону одной рукой|lateral_raise
Cable_Seated_Lateral_Raise|Махи в стороны на нижних блоках|lateral_raise
Standing_Low-Pulley_Deltoid_Raise|Отведение руки в сторону на нижнем блоке|lateral_raise
x_machine_lateral_raise|Махи в стороны в тренажёре|lateral_raise
Front_Dumbbell_Raise|Подъём гантелей перед собой|front_raise
Front_Two-Dumbbell_Raise|Подъём двух гантелей перед собой|front_raise
Front_Cable_Raise|Подъём руки вперёд на нижнем блоке|front_raise
Standing_Front_Barbell_Raise_Over_Head|Подъём штанги перед собой|front_raise
Bent_Over_Dumbbell_Rear_Delt_Raise_With_Head_On_Bench|Махи в наклоне с упором головой|bent_raise
Seated_Bent-Over_Rear_Delt_Raise|Махи в наклоне сидя на заднюю дельту|bent_raise
Reverse_Flyes|Разведение гантелей в наклоне|bent_raise
Reverse_Machine_Flyes|Обратная «бабочка» на заднюю дельту|reverse_fly
Cable_Rear_Delt_Fly|Разведение рук на блоках на заднюю дельту|reverse_fly
Face_Pull|Тяга каната к лицу|face_pull
Upright_Barbell_Row|Тяга штанги к подбородку|upright_row
Standing_Dumbbell_Upright_Row|Тяга гантелей к подбородку|upright_row
Upright_Cable_Row|Тяга нижнего блока к подбородку|upright_row
Smith_Machine_Upright_Row|Тяга к подбородку в Смите|upright_row
Barbell_Curl|Подъём штанги на бицепс|curl
EZ-Bar_Curl|Подъём EZ-грифа на бицепс|curl
Close-Grip_EZ_Bar_Curl|Подъём EZ-грифа узким хватом|curl
Wide-Grip_Standing_Barbell_Curl|Подъём штанги на бицепс широким хватом|curl
Dumbbell_Bicep_Curl|Подъём гантелей на бицепс|curl
Dumbbell_Alternate_Bicep_Curl|Попеременный подъём гантелей на бицепс|curl
Hammer_Curls|Молотки с гантелями|curl
Alternate_Hammer_Curl|Попеременные молотки|curl
Cross_Body_Hammer_Curl|Молотки к противоположному плечу|curl
Incline_Dumbbell_Curl|Подъём гантелей на бицепс на наклонной скамье|curl
Seated_Dumbbell_Curl|Подъём гантелей на бицепс сидя|curl
Concentration_Curls|Концентрированный подъём гантели|curl_preacher
Preacher_Curl|Подъём штанги на скамье Скотта|curl_preacher
One_Arm_Dumbbell_Preacher_Curl|Подъём гантели на скамье Скотта|curl_preacher
Cable_Preacher_Curl|Сгибание рук на скамье Скотта с нижнего блока|curl_preacher
Machine_Preacher_Curls|Сгибание рук в тренажёре Скотта|curl_preacher
Machine_Bicep_Curl|Сгибание рук в тренажёре|curl_preacher
Spider_Curl|«Паучьи» сгибания на скамье|curl_preacher
Standing_Biceps_Cable_Curl|Сгибание рук на нижнем блоке|curl
Cable_Hammer_Curls_-_Rope_Attachment|Молотки на нижнем блоке с канатом|curl
Reverse_Barbell_Curl|Подъём штанги обратным хватом|curl
Zottman_Curl|Сгибания Зоттмана|curl
Drag_Curl|Драг-сгибания со штангой|curl
Triceps_Pushdown|Разгибание рук на верхнем блоке|pushdown
Triceps_Pushdown_-_Rope_Attachment|Разгибание рук на верхнем блоке с канатом|pushdown
Triceps_Pushdown_-_V-Bar_Attachment|Разгибание рук на верхнем блоке с V-рукоятью|pushdown
Reverse_Grip_Triceps_Pushdown|Разгибание рук на блоке обратным хватом|pushdown
Machine_Triceps_Extension|Разгибание рук в тренажёре|pushdown
Triceps_Overhead_Extension_with_Rope|Разгибание из-за головы на блоке с канатом|tri_overhead
Standing_Dumbbell_Triceps_Extension|Французский жим гантели стоя|tri_overhead
Seated_Triceps_Press|Французский жим гантели сидя|tri_overhead
Standing_Overhead_Barbell_Triceps_Extension|Французский жим штанги стоя|tri_overhead
EZ-Bar_Skullcrusher|Французский жим EZ-грифа лёжа|skullcrusher
Lying_Triceps_Press|Французский жим лёжа|skullcrusher
Lying_Dumbbell_Tricep_Extension|Французский жим гантелей лёжа|skullcrusher
Tricep_Dumbbell_Kickback|Разгибание руки с гантелью в наклоне|kickback
Dips_-_Triceps_Version|Отжимания на брусьях|dip
Dip_Machine|Отжимания в тренажёре|dip
Bench_Dips|Обратные отжимания от скамьи|dip
Close-Grip_Barbell_Bench_Press|Жим штанги лёжа узким хватом|bench_press
Close-Grip_Dumbbell_Press|Жим гантелей лёжа узким хватом|bench_press
Smith_Machine_Close-Grip_Bench_Press|Жим лёжа узким хватом в Смите|bench_press
JM_Press|JM-жим|bench_press
Push-Ups_-_Close_Triceps_Position|Отжимания узкой постановкой рук|pushup
Barbell_Squat|Приседания со штангой|squat_back
Barbell_Full_Squat|Глубокие приседания со штангой|squat_back
Front_Barbell_Squat|Фронтальные приседания со штангой|squat_front
Box_Squat|Приседания на ящик|squat_back
Wide_Stance_Barbell_Squat|Приседания со штангой широкой постановкой|squat_back
Smith_Machine_Squat|Приседания в Смите|squat_back
Hack_Squat|Гакк-приседания в тренажёре|squat_back
Barbell_Hack_Squat|Гакк-приседания со штангой за спиной|squat_hold
Goblet_Squat|Гоблет-приседания|squat_front
Dumbbell_Squat|Приседания с гантелями|squat_hold
Plie_Dumbbell_Squat|Плие-приседания с гантелью|squat_hold
Bodyweight_Squat|Приседания без веса|squat_hold
Leg_Press|Жим ногами|leg_press
Narrow_Stance_Leg_Press|Жим ногами узкой постановкой|leg_press
Leg_Extensions|Разгибание ног в тренажёре|leg_ext
Single-Leg_Leg_Extension|Разгибание одной ноги в тренажёре|leg_ext
Barbell_Lunge|Выпады со штангой|lunge_bar
Barbell_Walking_Lunge|Выпады шагами со штангой|lunge_bar
Dumbbell_Lunges|Выпады с гантелями|lunge
Dumbbell_Rear_Lunge|Обратные выпады с гантелями|lunge
Split_Squat_with_Dumbbells|Болгарские сплит-приседания|lunge
Smith_Single-Leg_Split_Squat|Сплит-приседания в Смите|lunge_bar
Dumbbell_Step_Ups|Зашагивания на тумбу с гантелями|lunge
Barbell_Step_Ups|Зашагивания на тумбу со штангой|lunge_bar
Romanian_Deadlift|Румынская тяга|rdl
Stiff-Legged_Barbell_Deadlift|Тяга на прямых ногах|rdl
Stiff-Legged_Dumbbell_Deadlift|Румынская тяга с гантелями|rdl
Smith_Machine_Stiff-Legged_Deadlift|Тяга на прямых ногах в Смите|rdl
Lying_Leg_Curls|Сгибание ног лёжа|leg_curl_lying
Seated_Leg_Curl|Сгибание ног сидя|leg_curl_seated
Glute_Ham_Raise|Ягодично-бицепсовый подъём|hyperext
Barbell_Hip_Thrust|Ягодичный мост со штангой (хип-траст)|hip_thrust
x_machine_hip_thrust|Ягодичный мост в тренажёре|hip_thrust
Barbell_Glute_Bridge|Ягодичный мостик со штангой на полу|glute_bridge
Butt_Lift_Bridge|Ягодичный мостик|glute_bridge
Single_Leg_Glute_Bridge|Ягодичный мостик на одной ноге|glute_bridge
One-Legged_Cable_Kickback|Отведение ноги назад на нижнем блоке|kickback_leg
Glute_Kickback|Отведение ноги назад с упором|kickback_leg
Pull_Through|Протяжка нижнего блока между ног|swing
Thigh_Abductor|Разведение ног в тренажёре|abduction
Thigh_Adductor|Сведение ног в тренажёре|adduction
One-Arm_Kettlebell_Swings|Махи гирей одной рукой|swing
x_kb_swing|Махи гирей двумя руками|swing
Standing_Calf_Raises|Подъём на носки стоя в тренажёре|calf_raise
Standing_Dumbbell_Calf_Raise|Подъём на носки с гантелями|calf_raise
Smith_Machine_Calf_Raise|Подъём на носки в Смите|calf_raise
Seated_Calf_Raise|Подъём на носки сидя|calf_seated
Calf_Press_On_The_Leg_Press_Machine|Подъём на носки в тренажёре для жима ногами|calf_press
Crunches|Скручивания на полу|crunch
Decline_Crunch|Скручивания на наклонной скамье|crunch
Sit-Up|Подъём корпуса|crunch
Russian_Twist|Русские скручивания|crunch
Cable_Crunch|Скручивания на верхнем блоке («молитва»)|cable_crunch
Ab_Crunch_Machine|Скручивания в тренажёре|cable_crunch
Hanging_Leg_Raise|Подъём ног в висе на турнике|leg_raise_hanging
x_captains_chair|Подъём ног в упоре на локтях|leg_raise_hanging
Flat_Bench_Lying_Leg_Raise|Подъём ног лёжа на скамье|leg_raise_lying
Reverse_Crunch|Обратные скручивания|leg_raise_lying
Plank|Планка|plank
Side_Bridge|Боковая планка|plank
Barbell_Ab_Rollout_-_On_Knees|Ролик для пресса с колен|plank
Palms-Up_Barbell_Wrist_Curl_Over_A_Bench|Сгибание кистей со штангой|wrist_curl
Seated_Dumbbell_Palms-Up_Wrist_Curl|Сгибание кистей с гантелями сидя|wrist_curl
Palms-Down_Wrist_Curl_Over_A_Bench|Разгибание кистей со штангой|wrist_curl
`;

// Упражнения, которых нет в базе или которые в ней описаны иначе
const CUSTOM = {
  x_dips_chest: { en: 'Chest Dips', equipment: 'body only', mechanic: 'compound', primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  x_assisted_pullup: { en: 'Assisted Pull-Up', equipment: 'machine', mechanic: 'compound', primary: ['lats'], secondary: ['biceps', 'middle back'] },
  x_hyperextension: { en: 'Back Extension (45°)', equipment: 'machine', mechanic: 'compound', primary: ['lower back'], secondary: ['glutes', 'hamstrings'] },
  x_machine_lateral_raise: { en: 'Machine Lateral Raise', equipment: 'machine', mechanic: 'isolation', primary: ['shoulders'], secondary: [] },
  x_machine_hip_thrust: { en: 'Machine Hip Thrust', equipment: 'machine', mechanic: 'compound', primary: ['glutes'], secondary: ['hamstrings'] },
  x_kb_swing: { en: 'Two-Hand Kettlebell Swing', equipment: 'kettlebells', mechanic: 'compound', primary: ['glutes'], secondary: ['hamstrings', 'lower back'] },
  x_captains_chair: { en: "Captain's Chair Leg Raise", equipment: 'machine', mechanic: 'isolation', primary: ['abdominals'], secondary: [] },
};

const GROUP = {
  chest: 'chest', lats: 'back', 'middle back': 'back', 'lower back': 'back', traps: 'back',
  shoulders: 'shoulders', biceps: 'biceps', triceps: 'triceps', forearms: 'forearms',
  quadriceps: 'legs', hamstrings: 'legs', adductors: 'legs', abductors: 'legs',
  glutes: 'glutes', calves: 'calves', abdominals: 'abs', neck: 'back',
};

const EQUIP = {
  barbell: 'barbell', 'e-z curl bar': 'ezbar', dumbbell: 'dumbbell', machine: 'machine',
  cable: 'cable', 'body only': 'body', kettlebells: 'kettlebell', other: 'machine',
};

const LOWER = new Set(['quadriceps', 'hamstrings', 'glutes', 'adductors', 'abductors', 'calves', 'lower back']);

// Шаг прибавки по умолчанию (см. docs/progression.md)
function defaultStep(equipment, mechanic, primary) {
  const lower = LOWER.has(primary);
  switch (equipment) {
    case 'barbell': case 'smith': case 'ezbar': return lower && mechanic === 'compound' ? 5 : 2.5;
    case 'dumbbell': return mechanic === 'compound' ? 2 : 1;
    case 'machine': case 'cable': return mechanic === 'compound' || lower ? 5 : 2.5;
    case 'kettlebell': return 4;
    default: return 2.5;
  }
}

const out = [];
const seen = new Set();
for (const line of LIST.trim().split('\n')) {
  const [id, ru, anim] = line.split('|').map((s) => s.trim());
  if (seen.has(id)) throw new Error(`duplicate ${id}`);
  seen.add(id);
  let meta;
  if (CUSTOM[id]) {
    const c = CUSTOM[id];
    meta = { en: c.en, equipment: c.equipment, mechanic: c.mechanic, primaryMuscles: c.primary, secondaryMuscles: c.secondary };
  } else {
    const e = byId.get(id);
    if (!e) throw new Error(`not found in source: ${id}`);
    meta = { en: e.name, equipment: e.equipment, mechanic: e.mechanic, primaryMuscles: e.primaryMuscles, secondaryMuscles: e.secondaryMuscles };
  }
  let equipment = EQUIP[meta.equipment ?? 'other'] ?? 'machine';
  if (/smith/i.test(id)) equipment = 'smith';
  const mechanic = meta.mechanic === 'isolation' ? 'isolation' : 'compound';
  const primary = meta.primaryMuscles[0];
  out.push({
    id,
    ru,
    en: meta.en,
    group: GROUP[primary] ?? 'other',
    muscles: [...new Set([...meta.primaryMuscles, ...meta.secondaryMuscles])],
    equipment,
    mechanic,
    anim,
    step: equipment === 'body' ? 0 : defaultStep(equipment, mechanic, primary),
  });
}

writeFileSync(new URL('../src/data/catalog.json', import.meta.url), JSON.stringify(out, null, 0) + '\n');
const counts = {};
out.forEach((e) => (counts[e.group] = (counts[e.group] || 0) + 1));
console.log(`catalog: ${out.length} exercises`, counts);
