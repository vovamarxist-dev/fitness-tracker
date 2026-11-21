import { useEffect, useRef, useState } from 'react';
import { useApp, useLive } from '../lib/app';
import { db } from '../lib/db';
import { Sheet } from '../components/ui';
import { ExerciseAnim } from '../anim/ExerciseAnim';
import { getExercise, exName } from '../data/catalog';
import { finishWorkout } from '../logic/workout';
import { fmtKg } from '../logic/progression';
import { fmtDuration } from '../lib/i18n';
import { haptic, setClosingConfirmation } from '../lib/telegram';
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

  const restPlannedSets = async () => (await db.sessions.get(log.sessionId))?.restSets ?? 120;
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
    await setCursor({ setsDone, phase: 'restSet', restStartedAt: Date.now(), restPlanned: await restPlannedSets() });
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
  const completeExercise = async (completedSets: number | null) => {
    setConfirmOpen(false);
    setMenuOpen(false);
    const entries = [...log.entries];
    entries[c.index] = { ...entry, completedSets, finishedAt: Date.now(), startedAt: entry.startedAt || Date.now() };
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
        title={c.phase === 'restSet' ? t('rest') : t('restBetweenExercises')}
        nextLine={
          c.phase === 'restSet'
            ? `${t('setOf', { a: c.setsDone + 1, b: entry.plannedSets })} · ${weightLabel}`
            : `${exName(nextEx, lang)} · ${entry.plannedSets} × ${entry.reps} · ${weightLabel}`
        }
        anim={nextEx ? { anim: nextEx.anim, equipment: nextEx.equipment } : undefined}
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
            <ExerciseAnim anim={ex.anim} equipment={ex.equipment} size={150} />
          </div>
        )}
        <h1 className="workout-name">{exName(ex, lang)}</h1>
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
          initial={c.setsDone}
          hint={t('confirmHint', { r: entry.reps, w: weightLabel })}
          onConfirm={(n) => void completeExercise(n)}
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

function ConfirmSets({ planned, initial, hint, onConfirm }: { planned: number; initial: number; hint: string; onConfirm: (n: number) => void }) {
  const { t } = useApp();
  const [n, setN] = useState(initial);
  return (
    <div className="confirm">
      <h2>{t('confirmTitle')}</h2>
      <p className="muted">{hint}</p>
      <div className="confirm-grid">
        {Array.from({ length: planned + 1 }, (_, i) => (
          <button key={i} className={`num ${n === i ? 'on' : ''}`} onClick={() => (haptic.tap(), setN(i))}>
            {i}
          </button>
        ))}
      </div>
      <p className="confirm-of">
        {n} / {planned}
      </p>
      <button className="btn btn-primary btn-block btn-xl" onClick={() => onConfirm(n)}>
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
}: {
  startedAt: number;
  planned: number;
  title: string;
  nextLine: string;
  buttonLabel: string;
  onEnd: () => void;
  anim?: { anim: string; equipment: import('../logic/types').Equipment };
  progress: string;
  sound: boolean;
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
        {anim && <ExerciseAnim anim={anim.anim} equipment={anim.equipment} size={64} />}
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
