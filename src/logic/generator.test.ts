import { describe, expect, it } from 'vitest';
import { SPLITS, generateSessions } from './generator';
import { getExercise } from '../data/catalog';

describe('генератор планов', () => {
  it('все упражнения шаблонов есть в каталоге', () => {
    for (const s of SPLITS)
      for (const d of s.plan)
        for (const id of [...d.main, ...d.acc]) expect(getExercise(id), `${s.id}: ${id}`).toBeDefined();
  });

  it('число тренировок совпадает с днями в неделю', () => {
    for (const s of SPLITS) expect(s.plan.length).toBe(s.days);
  });

  it('цель меняет схему подходов и отдых', () => {
    const ppl = SPLITS.find((s) => s.id === 'ppl')!;
    const str = generateSessions(ppl, 'strength', 1)[0].exercises[0];
    const mass = generateSessions(ppl, 'mass', 1)[0].exercises[0];
    expect([str.sets, str.reps]).toEqual([5, 5]);
    expect([mass.sets, mass.reps]).toEqual([4, 8]);
    expect(str.rest).toBeGreaterThan(mass.rest);
    expect(str.step).toBe(2.5); // жим лёжа
  });
});
