import { useApp, useLive } from '../lib/app';
import { activeWorkout, db } from '../lib/db';

export function Home() {
  const { t, push } = useApp();
  const active = useLive(() => activeWorkout(), []);
  const last = useLive(
    () => db.workouts.orderBy('startedAt').reverse().filter((w) => w.finishedAt != null).first(),
    [],
  );

  return (
    <main className="screen home">
      <div className="home-hero">
        <div className="brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <h1 className="brand">{t('appName')}</h1>
        <div className="hazard" aria-hidden="true" />
        <p className="tagline">{t('tagline')}</p>
      </div>

      <nav className="home-actions">
        {active ? (
          <button className="btn btn-primary btn-xl" onClick={() => push({ name: 'workout', id: active.id })}>
            {t('continueWorkout')}
            <small>{active.sessionName}</small>
          </button>
        ) : (
          <button className="btn btn-primary btn-xl" onClick={() => push({ name: 'pick' })}>
            {t('startWorkout')}
          </button>
        )}
        <button className="btn btn-xl" onClick={() => push({ name: 'plans' })}>
          {t('myPlans')}
        </button>
        <button className="btn btn-xl" onClick={() => push({ name: 'history' })}>
          {t('history')}
        </button>
        <button className="btn btn-xl" onClick={() => push({ name: 'settings' })}>
          {t('settings')}
        </button>
      </nav>

      {last && (
        <button className="last-card" onClick={() => push({ name: 'summary', id: last.id })}>
          <span className="muted">{t('lastWorkout')}</span>
          <strong>{last.sessionName}</strong>
          <span className="muted">{new Date(last.startedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}</span>
        </button>
      )}
    </main>
  );
}
