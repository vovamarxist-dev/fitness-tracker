import { useApp, useLive } from '../lib/app';
import { activeWorkout, db } from '../lib/db';
import { discipline, estimateMin, startWorkout } from '../logic/workout';
import { exName, getExercise } from '../data/catalog';
import type { Session, WorkoutLog } from '../logic/types';

const DAY = 24 * 3600 * 1000;

/** Понедельник текущей недели, 00:00 */
function weekStart(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const wd = (d.getDay() + 6) % 7; // пн = 0
  return d.getTime() - wd * DAY;
}

/** Сколько килограммов поднято за тренировку: повторы × вес по каждому подходу */
function lifted(w: WorkoutLog) {
  let kg = 0;
  for (const e of w.entries) {
    if (!e.completedSets) continue;
    if (e.setReps?.length) e.setReps.forEach((r, i) => (kg += r * (e.setWeights?.[i] ?? e.weight)));
    else kg += e.completedSets * e.reps * e.weight;
  }
  return kg;
}

const fmtKg = (kg: number) => Math.round(kg).toLocaleString('ru-RU');

export function Home() {
  const { t, push, settings } = useApp();
  const lang = settings.lang;
  const go = async (s: Session) => {
    const log = await startWorkout(s);
    push({ name: 'workout', id: log.id });
  };
  const active = useLive(() => activeWorkout(), []);
  const sessions = useLive(() => db.sessions.orderBy('order').toArray(), []);
  const from = weekStart();
  const week = useLive(() => db.workouts.where('startedAt').aboveOrEqual(from).filter((w) => w.finishedAt != null).toArray(), [from]);
  const last = useLive(() => db.workouts.orderBy('startedAt').reverse().filter((w) => w.finishedAt != null).first(), []);

  // Следующая тренировка — та, что идёт в плане после последней выполненной
  let next: Session | undefined;
  if (sessions?.length) {
    const i = last ? sessions.findIndex((s) => s.id === last.sessionId) : -1;
    next = sessions[(i + 1) % sessions.length];
  }

  const goal = Math.min(7, Math.max(1, sessions?.length ?? 3));
  const doneDays = new Set((week ?? []).map((w) => Math.floor((w.startedAt - from) / DAY)));
  const today = Math.floor((Date.now() - from) / DAY);
  const kg = (week ?? []).reduce((s, w) => s + lifted(w), 0);
  const rests = (week ?? []).map(discipline).filter((d): d is NonNullable<ReturnType<typeof discipline>> => d != null);
  const restPct = rests.length ? Math.round(rests.reduce((s, d) => s + d.onTime, 0) / Math.max(1, rests.reduce((s, d) => s + d.total, 0)) * 100) : null;
  const dayNames = lang === 'ru' ? ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <main className="screen home">
      <header className="home-top">
        <div className="brand-row">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="brand">{t('appName')}</span>
        </div>
        <button className="gear" onClick={() => push({ name: 'settings' })} aria-label={t('settings')}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.4 4.6-.03-1.2 2-1.6-2-3.4-2.4.8a8 8 0 0 0-2-1.2L15.5 3h-4l-.5 2.5a8 8 0 0 0-2 1.2l-2.4-.8-2 3.4 2 1.6a8 8 0 0 0 0 2.3l-2 1.6 2 3.4 2.4-.8a8 8 0 0 0 2 1.2l.5 2.5h4l.5-2.5a8 8 0 0 0 2-1.2l2.4.8 2-3.4-2-1.6Z" />
          </svg>
        </button>
      </header>

      <h1 className="slogan">{t('tagline')}</h1>
      <div className="hazard" aria-hidden="true" />
      <p className="lead">{t('lead')}</p>

      {active ? (
        <section className="next-card">
          <span className="next-label">{t('inProgress')}</span>
          <strong className="next-name">{active.sessionName}</strong>
          <span className="muted small">{t('exOf', { i: Math.min(active.cursor.index + 1, active.entries.length), n: active.entries.length })}</span>
          <div className="next-progress" aria-hidden="true">
            {active.entries.map((e, i) => (
              <span key={e.uid} className={i < active.cursor.index ? 'on' : i === active.cursor.index ? 'cur' : ''} />
            ))}
          </div>
          <button className="btn btn-primary btn-xl" onClick={() => push({ name: 'workout', id: active.id })}>
            {t('continueWorkout')}
          </button>
        </section>
      ) : next ? (
        <section className="next-card">
          <span className="next-label">{t('nextWorkout')}</span>
          <strong className="next-name">{next.name}</strong>
          <span className="next-meta">
            <span>{next.exercises.length} {t('exShort')}</span>
            <span>{t('aboutMin', { n: estimateMin(next) })}</span>
          </span>
          <ul className="next-ex">
            {next.exercises.slice(0, 4).map((pe) => {
              const ex = getExercise(pe.exerciseId);
              return <li key={pe.uid}>{ex ? exName(ex, lang) : pe.exerciseId}</li>;
            })}
            {next.exercises.length > 4 && <li className="muted">+ {next.exercises.length - 4}</li>}
          </ul>
          <button className="btn btn-primary btn-xl" onClick={() => void go(next!)}
            disabled={next.exercises.length === 0}>
            {t('startWorkout')}
          </button>
          {sessions!.length > 1 && (
            <button className="link-btn" onClick={() => push({ name: 'pick' })}>
              {t('pickOther')}
            </button>
          )}
        </section>
      ) : sessions ? (
        <section className="next-card">
          <p className="next-empty">{t('firstPlan')}</p>
          <button className="btn btn-primary btn-xl" onClick={() => push({ name: 'plans' })}>
            {t('makePlan')}
          </button>
        </section>
      ) : null}

      <section className="week" aria-label={t('week')}>
        <div className="week-head">
          <span>{t('week')}</span>
          <span className="week-count">{t('weekOf', { done: doneDays.size, goal })}</span>
        </div>
        <ol className="week-days">
          {dayNames.map((d, i) => (
            <li key={i} className={`${doneDays.has(i) ? 'on' : ''} ${i === today ? 'today' : ''}`}>
              <span className="week-cell" />
              <span className="week-name">{d}</span>
            </li>
          ))}
        </ol>
        <dl className="week-stats">
          <div>
            <dt>{t('tonnage')}</dt>
            <dd>
              {fmtKg(kg)} <small>{t('kg')}</small>
            </dd>
          </div>
          <div>
            <dt>{t('restOnTime')}</dt>
            <dd>{restPct == null ? '—' : `${restPct}%`}</dd>
          </div>
        </dl>
      </section>

      <nav className="tiles">
        <button className="tile" onClick={() => push({ name: 'plans' })}>
          <strong>{t('plansTile')}</strong>
          <span>{t('plansTileHint')}</span>
        </button>
        <button className="tile" onClick={() => push({ name: 'history' })}>
          <strong>{t('historyTile')}</strong>
          <span>{last ? new Date(last.startedAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'long' }) : t('historyTileHint')}</span>
        </button>
      </nav>
    </main>
  );
}
