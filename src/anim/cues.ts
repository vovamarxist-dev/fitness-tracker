// Короткие подписи под анимацией: чем это упражнение отличается от похожих
// (хват, насадка, наклон скамьи, тренажёр). Берутся из модификаторов анимации и
// из подсказки техники в самом движении (Pattern.cue).
import { PATTERNS } from './patterns';
import type { Equipment, MuscleGroup as Group, Lang } from '../logic/types';

type Pair = [string, string];

const MOD: Record<string, Pair> = {
  wide: ['Широкий хват', 'Wide grip'],
  close: ['Узкий хват', 'Close grip'],
  vclose: ['Хват вплотную', 'Very close grip'],
  under: ['Обратный хват — ладони к себе', 'Underhand grip'],
  over: ['Прямой хват — ладони вниз', 'Overhand grip'],
  neutral: ['Нейтральный хват — ладони друг к другу', 'Neutral grip'],
  rope: ['Насадка: канат', 'Rope attachment'],
  vbar: ['Насадка: V-рукоять', 'V-handle'],
  alt: ['Попеременно', 'Alternating'],
  seated: ['Сидя', 'Seated'],
  onback: ['Штанга на спине', 'Bar on back'],
  incline: ['Скамья под углом 30–45° вверх', 'Incline bench 30–45°'],
  decline: ['Скамья головой вниз', 'Decline bench'],
  rails: ['В тренажёре Смита', 'Smith machine'],
  box: ['Присед до касания ящика', 'Sit back to a box'],
  support: ['С упором в наклонную скамью', 'Chest-supported'],
  assist: ['Противовес помогает подняться', 'Counterweight assists'],
  lever: ['Т-гриф: один конец упирается в пол', 'T-bar: one end on the floor'],
  deficit: ['Стоя на возвышении — длиннее амплитуда', 'Standing on a plate — longer range'],
  plates: ['Рычажный тренажёр с блинами', 'Plate-loaded lever'],
  slow: ['Медленный темп', 'Slow tempo'],
  pause: ['Пауза в крайней точке', 'Pause at the end'],
};

const LOWER: Group[] = ['legs', 'glutes', 'calves'];

export function animCues(anim: string, equipment: Equipment, group: Group, lang: Lang): string[] {
  const i = lang === 'ru' ? 0 : 1;
  const [base, ...mods] = anim.split('+');
  const out: string[] = [];
  const cue = PATTERNS[base]?.cue;
  if (cue) out.push(lang === 'ru' ? cue.ru : cue.en);
  for (const m of mods) {
    if (m === 'one') out.push(LOWER.includes(group) ? ['Одной ногой', 'One leg'][i] : ['Одной рукой', 'One arm'][i]);
    else if (MOD[m]) out.push(MOD[m][i]);
  }
  if (equipment === 'machine' && PATTERNS[base]?.pivot && !mods.includes('plates')) out.push(['Блочный тренажёр: рычаг тянет грузоблок', 'Selectorized: lever lifts the stack'][i]);
  return out;
}
