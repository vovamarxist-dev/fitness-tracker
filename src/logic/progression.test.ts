import { describe, expect, it } from 'vitest';
import { recommend, roundDown, type ProgressInput, type PrevInfo } from './progression';

const DAY = 86400000;
const base: ProgressInput = { weight: 80, reps: 8, plannedSets: 4, completedSets: 4, step: 2.5, mechanic: 'compound', date: 100 * DAY };

/** Прогоняет серию тренировок, каждый раз ставя рекомендованный вес */
function run(results: number[], start: Partial<ProgressInput> = {}) {
  let prev: PrevInfo | undefined;
  let weight = start.weight ?? base.weight;
  const out = [];
  for (const [i, completedSets] of results.entries()) {
    const date = base.date + i * 3 * DAY;
    const r = recommend({ ...base, ...start, weight, completedSets, date }, prev);
    out.push({ weight, ...r });
    prev = { state: r.state, date };
    weight = r.nextWeight;
  }
  return out;
}

describe('roundDown', () => {
  it('округляет вниз до шага', () => {
    expect(roundDown(72, 2.5)).toBe(70);
    expect(roundDown(74.99, 2.5)).toBe(72.5);
    expect(roundDown(75, 2.5)).toBe(75);
    expect(roundDown(18.9, 2)).toBe(18);
  });
});

describe('recommend', () => {
  it('базовое: прибавка после каждой успешной тренировки', () => {
    const r = run([4, 4, 4]);
    expect(r.map((x) => x.weight)).toEqual([80, 82.5, 85]);
    expect(r[2].nextWeight).toBe(87.5);
    expect(r[0].action).toBe('increase');
  });

  it('изоляция: прибавка после двух успешных тренировок подряд', () => {
    const r = run([4, 4, 4, 4], { mechanic: 'isolation', weight: 20, step: 1 });
    expect(r.map((x) => x.weight)).toEqual([20, 20, 21, 21]);
    expect(r[0].action).toBe('hold');
    expect(r[1].action).toBe('increase');
  });

  it('первая неудача — держим вес', () => {
    const r = run([3]);
    expect(r[0].action).toBe('hold');
    expect(r[0].nextWeight).toBe(80);
  });

  it('сильная неудача — сразу минус шаг', () => {
    const r = run([1]);
    expect(r[0].action).toBe('decrease');
    expect(r[0].nextWeight).toBe(77.5);
  });

  it('две неудачи подряд — откат 10% и план разгона', () => {
    const r = run([3, 3]);
    expect(r[1].action).toBe('reset');
    expect(r[1].nextWeight).toBe(70); // 80 × 0,9 = 72 → вниз до шага 2,5
  });

  it('откат кратен шагу и разгон возвращает к застрявшему весу', () => {
    const r = run([3, 3, 4, 4, 4, 4, 4], { weight: 100, step: 2.5 });
    expect(r[1].action).toBe('reset');
    expect(r[1].nextWeight).toBe(90);
    expect(r[1].ladder).toEqual([90, 92.5, 95, 97.5, 100, 102.5]);
    expect(r.map((x) => x.weight)).toEqual([100, 100, 90, 92.5, 95, 97.5, 100]);
    expect(r[6].nextWeight).toBe(102.5);
  });

  it('изоляция во время разгона прибавляет каждую тренировку', () => {
    const r = run([3, 3, 4, 4], { mechanic: 'isolation', weight: 20, step: 1 });
    expect(r.map((x) => x.weight)).toEqual([20, 20, 18, 19]);
  });

  it('повторный застой на том же весе — предлагаем сменить подход', () => {
    // 100 → застой → откат 90 → разгон до 100 → снова застой
    const r = run([3, 3, 4, 4, 4, 4, 3, 3], { weight: 100 });
    expect(r[6].weight).toBe(100);
    expect(r[7].action).toBe('stall');
    expect(r[7].messages.join(' ')).toContain('1,25');
  });

  it('после перерыва больше 14 дней и неудачи — минус 10%', () => {
    const first = recommend({ ...base, completedSets: 4 });
    const r = recommend({ ...base, weight: first.nextWeight, completedSets: 2, date: base.date + 20 * DAY }, { state: first.state, date: base.date });
    expect(r.action).toBe('break');
    expect(r.nextWeight).toBe(72.5); // 82.5 * 0.9 = 74.25 → 72.5
  });

  it('собственный вес — прогрессия повторами', () => {
    const r = recommend({ ...base, weight: 0, step: 0, reps: 10 });
    expect(r.action).toBe('reps');
    expect(r.nextReps).toBe(11);
  });

  it('учитывает отдых короче плана при неудаче', () => {
    const r = recommend({
      ...base,
      completedSets: 3,
      rests: [
        { kind: 'set', planned: 120, actual: 60 },
        { kind: 'set', planned: 120, actual: 70 },
      ],
    });
    expect(r.messages.some((m) => m.includes('меньше плана'))).toBe(true);
  });
});

describe('повторы по подходам', () => {
  it('при неудаче показывает повторы и недобор', () => {
    const r = recommend({ ...base, completedSets: 2, plannedSets: 3, setReps: [8, 8, 6] });
    expect(r.messages[1]).toContain('8 · 8 · 6');
    expect(r.messages[1]).toContain('Не добрал 2');
  });
});
