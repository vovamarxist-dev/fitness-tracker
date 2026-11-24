import { useEffect, useRef, useState } from 'react';
import { useApp, useLive } from '../lib/app';
import { db } from '../lib/db';
import { Sheet, Stepper, WeightInput, AnimCues } from '../components/ui';
import { ExerciseAnim } from '../anim/ExerciseAnim';
import { getExercise, exName } from '../data/catalog';
import { finishWorkout } from '../logic/workout';
import { fmtKg } from '../logic/progression';
import { fmtDuration } from '../lib/i18n';
import { haptic, setClosingConfirmation, tg } from '../lib/telegram';
import { cancelRestReminder, ensureWriteAccess, scheduleRestReminder } from '../lib/notify';
import { beep, unlockAudio } from '../lib/sound';
import type { WorkoutCursor, WorkoutLog } from '../logic/types';

const WARN_AT = 10; // сек до конца отдыха — предупреждение
const NAG_EVERY = 15; // сек — повторное напоминание, если отдых затянулся

export function Workout({ id }: { id: string }) {
  const { t, replace, settings } = useApp();
  const log = useLive(() => db.workouts.get(id), [id]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setClosingConfirmation(true);
    return () => setClosingConfirmation(false);
  }, []);

  useEffect(() => {
    if (settings.botReminders) void ensureWriteAccess();
  }, [settings.botReminders]);

  // Тренировка уже завершена или в ней нет упражнений — сразу к итогам
  const finished = !!log?.finishedAt;
  const empty = log?.entries.length === 0;
  useEffect(() => {
    if (!log) return;
    if (finished) replace({ name: 'summary', id: log.id });
    else if (empty) void finishWorkout(log).then(() => replace({ name: 'summary', id: log.id }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, empty]);

  if (!log || finished || empty) return null;

  const session = log; // для краткости
  const c = log.cursor;
  const entry = log.entries[c.index];
  const ex = getExercise(entry.exerciseId);
  const lang = settings.lang;

  const save = (patch: Partial<WorkoutLog>) => db.workouts.put({ ...log, ...patch });
  const setCursor = (patch: Partial<WorkoutCursor>) => save({ cursor: { ...c, ...patch } });

  const restPlannedEx = async () => (await db.sessions.get(log.sessionId))?.restExercises ?? 180;

  const onSetDone = async () => {
    unlockAudio();
    haptic.tap();
    const setsDone = c.setsDone + 1;
    if (setsDone >= entry.plannedSets) {
      await setCursor({ setsDone });
      setConfirmOpen(true);
      return;
    }
    await setCursor({ setsDone, phase: 'restSet', restStartedAt: Date.now(), restPlanned: entry.rest ?? 120 });
  };

  const endRest = async () => {
    unlockAudio();
    if (c.restStartedAt == null) return;
    const rec = { kind: c.phase === 'restSet' ? ('set' as const) : ('exercise' as const), planned: c.restPlanned, actual: Math.round((Date.now() - c.restStartedAt) / 1000) };
    const entries = [...log.entries];
    let exerciseRests = log.exerciseRests;
    if (rec.kind === 'set') entries[c.index] = { ...entry, rests: [...entry.rests, rec] };
    else {
      exerciseRests = [...exerciseRests, rec];
      entries[c.index] = { ...entry, startedAt: Date.now() };
    }
    haptic.tap();
    await save({ entries, exerciseRests, cursor: { ...c, phase: 'exercise', restStartedAt: null } });
  };

  /** Фиксирует результат упражнения и переходит к отдыху перед следующим */
  const completeExercise = async (sets: SetResult[] | null) => {
    setConfirmOpen(false);
    setMenuOpen(false);
    const entries = [...log.entries];
    // Полностью выполненный подход — все запланированные повторы с плановым весом (или больше)
    const done = sets?.filter((x) => x.reps > 0) ?? null;
    const completedSets = done ? done.filter((x) => x.reps >= entry.reps && x.weight >= entry.weight).length : null;
    entries[c.index] = {
      ...entry,
      completedSets,
      setReps: done?.map((x) => x.reps),
      setWeights: done?.map((x) => x.weight),
      finishedAt: Date.now(),
      startedAt: entry.startedAt || Date.now(),
    };
    const next = c.index + 1;
    if (next >= entries.length) {
      const done = await finishWorkout({ ...log, entries });
      haptic.done();
      replace({ name: 'summary', id: done.id });
      return;
    }
    await save({
      entries,
      cursor: { index: next, setsDone: 0, phase: 'restExercise', restStartedAt: Date.now(), restPlanned: await restPlannedEx() },
    });
  };

  const finishAll = async () => {
    if (!confirm(t('finishWorkoutQ'))) return;
    setMenuOpen(false);
    const done = await finishWorkout(log);
    replace({ name: 'summary', id: done.id });
  };

  const weightLabel = entry.weight > 0 ? `${fmtKg(entry.weight)} ${t('kg')}` : t('noWeight');
  const progress = `${c.index + 1} / ${log.entries.length}`;

  if (c.phase !== 'exercise' && c.restStartedAt != null) {
    const nextEx = c.phase === 'restExercise' ? ex : undefined;
    return (
      <RestTimer
        key={`${c.index}-${c.setsDone}-${c.phase}`}
        startedAt={c.restStartedAt}
        planned={c.restPlanned}
        sound={settings.sound}
        reminders={settings.botReminders}
        title={c.phase === 'restSet' ? t('rest') : t('restBetweenExercises')}
        nextLine={
          c.phase === 'restSet'
            ? `${t('setOf', { a: c.setsDone + 1, b: entry.plannedSets })} · ${weightLabel}`
            : `${exName(nextEx, lang)} · ${entry.plannedSets} × ${entry.reps} · ${weightLabel}`
        }
        anim={nextEx ? { anim: nextEx.anim, equipment: nextEx.equipment, muscles: nextEx.muscles } : undefined}
        buttonLabel={c.phase === 'restSet' ? t('startSet') : t('startNextExercise')}
        onEnd={endRest}
        progress={progress}
      />
    );
  }

  return (
    <main className="screen workout">
      <div className="workout-top">
        <span className="muted">
          {session.sessionName} · {progress}
        </span>
        <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="menu">
          ⋯
        </button>
      </div>

      <section className="workout-main">
        {ex && (
          <div className="workout-anim">
            <ExerciseAnim anim={ex.anim} equipment={ex.equipment} muscle={ex.muscles[0]} size={170} />
          </div>
        )}
        <h1 className="workout-name">{exName(ex, lang)}</h1>
        {ex && <AnimCues anim={ex.anim} equipment={ex.equipment} group={ex.group} lang={lang} />}
        <div className="workout-target">
          <div>
            <span className="big">{entry.plannedSets}</span>
            <span className="muted">{t('sets').toLowerCase()}</span>
          </div>
          <div>
            <span className="big">{entry.reps}</span>
            <span className="muted">{t('reps').toLowerCase()}</span>
          </div>
          <div>
            <span className="big">{entry.weight > 0 ? fmtKg(entry.weight) : '—'}</span>
            <span className="muted">{t('kg')}</span>
          </div>
        </div>
        <div className="set-dots" aria-label={t('setOf', { a: Math.min(c.setsDone + 1, entry.plannedSets), b: entry.plannedSets })}>
          {Array.from({ length: entry.plannedSets }, (_, i) => (
            <span key={i} className={i < c.setsDone ? 'dot on' : i === c.setsDone ? 'dot cur' : 'dot'} />
          ))}
        </div>
        <p className="set-label">{t('setOf', { a: Math.min(c.setsDone + 1, entry.plannedSets), b: entry.plannedSets })}</p>
      </section>

      <div className="workout-actions">
        <button className="btn btn-primary btn-xxl" onClick={() => void onSetDone()} disabled={c.setsDone >= entry.plannedSets}>
          {t('setDone')}
        </button>
        <button className="btn btn-block" onClick={() => setConfirmOpen(true)}>
          {t('finishExercise')}
        </button>
      </div>

      <Sheet open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <ConfirmSets
          key={`${c.index}-${c.setsDone}`}
          planned={entry.plannedSets}
          setsDone={c.setsDone}
          targetReps={entry.reps}
          targetWeight={entry.weight}
          step={entry.step}
          hint={t('confirmHint', { r: entry.reps, w: weightLabel })}
          onConfirm={(sets) => void completeExercise(sets)}
        />
      </Sheet>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)}>
        <div className="menu">
          <button className="btn btn-block" onClick={() => void completeExercise(null)}>
            {t('skipExercise')}
          </button>
          <button className="btn btn-block danger" onClick={() => void finishAll()}>
            {t('finishWorkout')}
          </button>
          <button className="btn btn-ghost btn-block" onClick={() => setMenuOpen(false)}>
            {t('cancel')}
          </button>
        </div>
      </Sheet>
    </main>
  );
}

interface SetResult {
  reps: number;
  weight: number;
}

/** Подтверждение упражнения: повторы и вес в каждом подходе. 0 повторов — подход не делали. */
function ConfirmSets({
  planned,
  setsDone,
  targetReps,
  targetWeight,
  step,
  hint,
  onConfirm,
}: {
  planned: number;
  setsDone: number;
  targetReps: number;
  targetWeight: number;
  step: number;
  hint: string;
  onConfirm: (sets: SetResult[]) => void;
}) {
  const { t } = useApp();
  const withWeight = targetWeight > 0 || step > 0;
  // Отмеченные подходы — по плану, неотмеченные — 0 повторов. Если не отмечено ни одного, считаем, что сделаны все.
  const [rows, setRows] = useState<SetResult[]>(() =>
    Array.from({ length: Math.max(planned, setsDone) }, (_, i) => ({
      reps: setsDone === 0 || i < setsDone ? targetReps : 0,
      weight: targetWeight,
    })),
  );
  const setReps = (i: number, reps: number) => setRows((r) => r.map((x, j) => (j === i ? { ...x, reps } : x)));
  // Сменил вес в подходе — следующие подходы с тем же весом меняются вместе с ним (обычно вес снижают до конца)
  const setWeight = (i: number, weight: number) =>
    setRows((r) => {
      const old = r[i].weight;
      return r.map((x, j) => (j === i || (j > i && x.weight === old) ? { ...x, weight } : x));
    });
  const isFull = (x: SetResult) => x.reps >= targetReps && x.weight >= targetWeight;
  const full = rows.filter(isFull).length;
  return (
    <div className="confirm">
      <h2>{t('confirmTitle')}</h2>
      <p className="muted">{hint}</p>
      <ul className="reps-list">
        {rows.map((x, i) => (
          <li key={i} className={isFull(x) ? 'full' : x.reps === 0 ? 'zero' : 'part'}>
            <div className="reps-head">
              <span className="reps-set">{t('setN', { n: i + 1 })}</span>
              {i >= planned && (
                <button className="icon-btn" onClick={() => setRows((r) => r.filter((_, j) => j !== i))} aria-label={t('delete')}>
                  ✕
                </button>
              )}
            </div>
            <div className={withWeight ? 'reps-grid' : ''}>
              <Stepper label={t('reps')} value={x.reps} min={0} max={300} onChange={(v) => setReps(i, v)} />
              {withWeight && <WeightInput label={t('weight')} value={x.weight} step={step} onChange={(v) => setWeight(i, v)} />}
            </div>
          </li>
        ))}
      </ul>
      {rows.length < planned + 5 && (
        <button
          className="btn btn-ghost btn-block"
          onClick={() => setRows((r) => [...r, { reps: targetReps, weight: r[r.length - 1]?.weight ?? targetWeight }])}
        >
          + {t('addSet')}
        </button>
      )}
      <p className="confirm-of">{t('fullSets', { a: full, b: planned })}</p>
      <button className="btn btn-primary btn-block btn-xl" onClick={() => onConfirm(rows)}>
        {t('confirm')}
      </button>
    </div>
  );
}

function RestTimer({
  startedAt,
  planned,
  title,
  nextLine,
  buttonLabel,
  onEnd,
  anim,
  progress,
  sound,
  reminders,
}: {
  startedAt: number;
  planned: number;
  title: string;
  nextLine: string;
  buttonLabel: string;
  onEnd: () => void;
  anim?: { anim: string; equipment: import('../logic/types').Equipment; muscles: string[] };
  progress: string;
  sound: boolean;
  reminders: boolean;
}) {
  const { t } = useApp();
  const [now, setNow] = useState(Date.now());
  const fired = useRef({ warn: false, end: false, nag: 0 });

  // Время считаем от реальных часов: таймер верен, даже если приложение свернули
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const iv = setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  // Свернул приложение во время отдыха — напоминание придёт от бота; вернулся — отменяем
  useEffect(() => {
    if (!reminders) return;
    const restId = String(startedAt);
    const endsAt = startedAt + planned * 1000;
    const away = () => scheduleRestReminder(restId, endsAt, nextLine);
    const back = () => cancelRestReminder(restId);
    const onVis = () => (document.visibilityState === 'hidden' ? away() : back());
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', away);
    tg?.onEvent('deactivated', away);
    tg?.onEvent('activated', back);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', away);
      tg?.offEvent('deactivated', away);
      tg?.offEvent('activated', back);
      back(); // отдых закончился — напоминания больше не нужны
    };
  }, [reminders, startedAt, planned, nextLine]);

  const elapsed = (now - startedAt) / 1000;
  const left = planned - elapsed;
  const over = left < 0;

  useEffect(() => {
    const f = fired.current;
    if (!f.warn && left <= WARN_AT && left > 0 && planned > WARN_AT) {
      f.warn = true;
      haptic.warn();
      if (sound) beep.warn();
    }
    if (!f.end && left <= 0) {
      f.end = true;
      f.nag = 0;
      haptic.done();
      if (sound) beep.end();
    }
    if (over) {
      const n = Math.floor(-left / NAG_EVERY);
      if (n > f.nag) {
        f.nag = n;
        haptic.warn();
        if (sound) beep.warn();
      }
    }
  }, [left, over, planned, sound]);

  const pct = Math.max(0, Math.min(1, elapsed / planned));
  const R = 120;
  const C = 2 * Math.PI * R;

  return (
    <main className={`screen rest ${over ? 'over' : left <= WARN_AT ? 'soon' : ''}`}>
      <div className="workout-top">
        <span className="muted">{progress}</span>
      </div>
      <p className="rest-title">{over ? t('overtime') : title}</p>
      <div className="ring">
        <svg viewBox="0 0 280 280" aria-hidden="true">
          <circle cx="140" cy="140" r={R} className="ring-bg" />
          <circle cx="140" cy="140" r={R} className="ring-fg" strokeDasharray={C} strokeDashoffset={over ? 0 : C * pct} transform="rotate(-90 140 140)" />
        </svg>
        <div className="ring-text" role="timer" aria-live="off">
          <span className="ring-time">{over ? `+${fmtDuration(-left)}` : fmtDuration(Math.ceil(left))}</span>
          <span className="muted">{fmtDuration(planned)}</span>
        </div>
      </div>
      <div className="rest-next">
        {anim && <ExerciseAnim anim={anim.anim} equipment={anim.equipment} muscle={anim.muscles[0]} size={64} guides={false} />}
        <div>
          <span className="muted small">{t('upNext')}</span>
          <strong>{nextLine}</strong>
        </div>
      </div>
      <button className={`btn btn-xxl ${over || left <= WARN_AT ? 'btn-primary' : ''}`} onClick={onEnd}>
        {buttonLabel}
      </button>
    </main>
  );
}
