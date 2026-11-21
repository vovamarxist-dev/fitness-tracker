// Правила прогрессии весов. Описание: docs/progression.md
import type { Mechanic, ProgressState, Recommendation, RestRecord } from './types';

const DAY = 24 * 60 * 60 * 1000;

export interface ProgressInput {
  weight: number;
  reps: number;
  plannedSets: number;
  completedSets: number;
  step: number; // 0 — упражнение с собственным весом
  mechanic: Mechanic;
  date: number;
  rests?: RestRecord[];
  setReps?: number[]; // фактические повторы в подходах
}

export interface PrevInfo {
  state: ProgressState;
  date: number; // дата прошлого выполнения упражнения
}

/** Округление вниз до шага, чтобы вес можно было собрать из реальных блинов */
export function roundDown(x: number, step: number): number {
  if (step <= 0) return Math.round(x * 10) / 10;
  const r = Math.floor(x / step + 1e-9) * step;
  return Math.round(r * 100) / 100;
}

export const fmtKg = (x: number) => String(Math.round(x * 100) / 100).replace('.', ',');

function restNote(rests: RestRecord[] | undefined, success: boolean): string | null {
  const sets = (rests ?? []).filter((r) => r.kind === 'set' && r.planned > 0);
  if (sets.length === 0) return null;
  const planned = sets.reduce((s, r) => s + r.planned, 0);
  const actual = sets.reduce((s, r) => s + r.actual, 0);
  const dev = (actual - planned) / planned;
  if (!success && dev < -0.25) return 'Отдыхал заметно меньше плана — мышцы не успели восстановиться. Держи таймер, а не гони.';
  if (success && dev > 0.25) return 'Подходы взяты, но с отдыхом длиннее плана. В следующий раз держи таймер — тогда прибавка честная.';
  return null;
}

export function recommend(cur: ProgressInput, prev?: PrevInfo): Recommendation {
  const { weight: W, step, plannedSets: S, completedSets: C, reps } = cur;
  const success = C >= S;
  const msgs: string[] = [];

  // Состояние переносится, только если вес не меняли вручную
  const base: ProgressState =
    prev && prev.state.weight === W
      ? { ...prev.state }
      : { weight: W, successStreak: 0, failStreak: 0, rebuildTarget: prev?.state.rebuildTarget ?? null, resetCount: prev?.state.resetCount ?? 0 };

  const note = restNote(cur.rests, success);
  const finish = (r: Omit<Recommendation, 'messages'> & { messages?: string[] }): Recommendation => {
    const messages = [...(r.messages ?? msgs)];
    // При неудаче показываем, где именно не хватило повторов
    if (!success && cur.setReps?.length) {
      const short = cur.setReps.filter((x) => x < reps);
      const missing = short.reduce((s, x) => s + (reps - x), 0);
      messages.splice(1, 0, `Повторы по подходам: ${cur.setReps.join(' · ')} (план ${reps}). Не добрал ${missing} повт.`);
    }
    if (note) messages.push(note);
    return { ...r, messages };
  };

  // Собственный вес: прогрессия повторами
  if (step <= 0) {
    if (success) {
      const nextReps = reps + 1;
      return finish({
        action: 'reps',
        nextWeight: W,
        nextReps,
        messages: [nextReps > 15 ? `Больше 15 повторов — пора вешать отягощение 2,5 кг.` : `Все подходы закрыты. В следующий раз — ${nextReps} повторов в подходе.`],
        state: { ...base, weight: W, successStreak: base.successStreak + 1, failStreak: 0 },
      });
    }
    return finish({
      action: 'hold',
      nextWeight: W,
      nextReps: reps,
      messages: [`Не все подходы закрыты. Остаёмся на ${reps} повторах — добей все ${S} подходов.`],
      state: { ...base, successStreak: 0, failStreak: base.failStreak + 1 },
    });
  }

  // 0. После перерыва
  const gap = prev ? (cur.date - prev.date) / DAY : 0;
  if (!success && gap > 14) {
    const k = gap > 28 ? 0.8 : 0.9;
    const next = roundDown(W * k, step);
    return finish({
      action: 'break',
      nextWeight: next,
      nextReps: reps,
      messages: [
        `Перерыв ${Math.round(gap)} дн. — сила просела, это нормально. Снижай до ${fmtKg(next)} кг (−${Math.round((1 - k) * 100)}%) и за несколько тренировок вернись к ${fmtKg(W)} кг.`,
      ],
      state: { weight: next, successStreak: 0, failStreak: 0, rebuildTarget: W, resetCount: base.resetCount },
    });
  }

  const rebuilding = base.rebuildTarget != null && W < base.rebuildTarget;

  // 1. Все подходы выполнены
  if (success) {
    const streak = base.successStreak + 1;
    const need = cur.mechanic === 'isolation' && !rebuilding ? 2 : 1;
    let rebuildTarget = base.rebuildTarget;
    let resetCount = base.resetCount;
    if (rebuildTarget != null && W > rebuildTarget) {
      rebuildTarget = null; // разгон завершён, застой пройден
      resetCount = 0;
    }
    if (streak >= need) {
      const next = roundDown(W + step, step);
      if (rebuilding && next >= (base.rebuildTarget as number)) {
        msgs.push(`Все подходы закрыты. Разгон почти завершён — дальше ${fmtKg(next)} кг.`);
      } else if (base.rebuildTarget != null && W === base.rebuildTarget) {
        msgs.push(`Взял вес, на котором стоял. Следующая цель — ${fmtKg(next)} кг.`);
      } else {
        msgs.push(`Все подходы закрыты. В следующий раз — ${fmtKg(next)} кг (+${fmtKg(step)}). Растём.`);
      }
      return finish({
        action: 'increase',
        nextWeight: next,
        nextReps: reps,
        state: { weight: next, successStreak: 0, failStreak: 0, rebuildTarget, resetCount },
      });
    }
    msgs.push(`Все подходы закрыты. В изоляции закрепляем вес ещё одну тренировку: снова ${fmtKg(W)} кг, потом прибавка.`);
    return finish({
      action: 'hold',
      nextWeight: W,
      nextReps: reps,
      state: { ...base, successStreak: streak, failStreak: 0, rebuildTarget, resetCount },
    });
  }

  // 2–4. Не все подходы выполнены
  const fails = base.failStreak + 1;

  if (fails >= 2) {
    const target = base.rebuildTarget != null && base.rebuildTarget >= W ? base.rebuildTarget : W;
    const resetCount = target === base.rebuildTarget ? base.resetCount + 1 : 1;
    if (resetCount >= 2 && W >= target) {
      // 4. Повторный застой на том же весе
      const half = step / 2;
      const next = roundDown(W * 0.9, step);
      return finish({
        action: 'stall',
        nextWeight: next,
        nextReps: reps,
        messages: [
          `${fmtKg(W)} кг снова не поддались после отката. Меняем подход — выбери вариант:`,
          `• уменьшить шаг до ${fmtKg(half)} кг (мини-блины) и разогнаться от ${fmtKg(next)} кг;`,
          `• сменить схему ${S}×${reps} → ${S}×${Math.max(1, reps - 2)}, набрать вес, затем вернуть повторы.`,
        ],
        state: { weight: next, successStreak: 0, failStreak: 0, rebuildTarget: target, resetCount },
      });
    }
    // 3. Откат и разгон
    const next = roundDown(target * 0.9, step);
    const ladder: number[] = [];
    for (let x = next; x <= target + 1e-9; x = roundDown(x + step, step)) ladder.push(x);
    ladder.push(roundDown(target + step, step));
    return finish({
      action: 'reset',
      nextWeight: next,
      nextReps: reps,
      ladder,
      messages: [
        `Две тренировки подряд ${fmtKg(target)} кг не взяты полностью — вес встал. Откатываемся на 10%, до ${fmtKg(next)} кг.`,
        `План разгона: ${ladder.map(fmtKg).join(' → ')} кг. Вернёшься к ${fmtKg(target)} кг со свежими силами и пробьёшь его.`,
      ],
      state: { weight: next, successStreak: 0, failStreak: 0, rebuildTarget: target, resetCount },
    });
  }

  if (C < S / 2) {
    const next = roundDown(W - step, step);
    return finish({
      action: 'decrease',
      nextWeight: next,
      nextReps: reps,
      messages: [`Закрыто меньше половины подходов (${C} из ${S}). Снижаем до ${fmtKg(next)} кг и ставим технику.`],
      state: { weight: next, successStreak: 0, failStreak: 0, rebuildTarget: base.rebuildTarget ?? W, resetCount: base.resetCount },
    });
  }

  return finish({
    action: 'hold',
    nextWeight: W,
    nextReps: reps,
    messages: [`Закрыто ${C} из ${S} подходов. Остаёмся на ${fmtKg(W)} кг — добей все подходы.`],
    state: { ...base, successStreak: 0, failStreak: fails },
  });
}
