import { useApp, useLive } from '../lib/app';
import { db, uid } from '../lib/db';
import { Header, fmtRest } from '../components/ui';
import { estimateMin, startWorkout } from '../logic/workout';
import { getExercise, exName } from '../data/catalog';
import { plural } from '../lib/i18n';
import type { Session } from '../logic/types';

export function useSessions() {
  return useLive(() => db.sessions.orderBy('order').toArray(), []);
}

/** Список тренировок: в режиме pick — выбор тренировки на сегодня */
export function Plans({ pick = false }: { pick?: boolean }) {
  const { t, push, replace, settings } = useApp();
  const sessions = useSessions();

  const create = async () => {
    const now = Date.now();
    const s: Session = {
      id: uid(),
      name: '',
      exercises: [],
      restExercises: 180,
      order: (sessions?.length ?? 0) + 1,
      createdAt: now,
      updatedAt: now,
    };
    await db.sessions.put(s);
    push({ name: 'session', id: s.id });
  };

  const start = async (s: Session) => {
    const log = await startWorkout(s);
    replace({ name: 'workout', id: log.id });
  };

  if (!sessions) return null;
  return (
    <main className="screen">
      <Header title={pick ? t('chooseSession') : t('myPlans')} />
      {sessions.length === 0 && <p className="empty">{t('noSessions')}</p>}
      <ul className="list">
        {sessions.map((s) => {
          const ready = s.exercises.length > 0;
          return (
            <li key={s.id}>
              <button
                className="card session-card"
                disabled={pick && !ready}
                onClick={() => (pick ? void start(s) : push({ name: 'session', id: s.id }))}
              >
                <strong className="session-name">{s.name || t('newSession')}</strong>
                <span className="next-meta">
                  <span>{plural(s.exercises.length, settings.lang, { ru: ['упражнение', 'упражнения', 'упражнений'], en: ['exercise', 'exercises'] })}</span>
                  {ready && <span>{t('aboutMin', { n: estimateMin(s) })}</span>}
                  <span className="muted-meta">
                    {t('restShort')} {fmtRest(s.restExercises, t)}
                  </span>
                </span>
                {ready && (
                  <span className="session-ex">
                    {s.exercises
                      .slice(0, 4)
                      .map((e) => exName(getExercise(e.exerciseId), settings.lang))
                      .join(', ')}
                    {s.exercises.length > 4 ? ' …' : ''}
                  </span>
                )}
                <span className="card-arrow">{pick ? '▶' : '›'}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {!pick && (
        <div className="plans-actions sticky-bottom">
          <button className="btn btn-block" onClick={() => push({ name: 'generate' })}>
            ⚡ {t('generateBtn')}
          </button>
          <button className="btn btn-primary btn-block" onClick={create}>
            + {t('createSession')}
          </button>
        </div>
      )}
      {pick && sessions.length === 0 && (
        <>
          <button className="btn btn-primary btn-block" onClick={() => replace({ name: 'generate' })}>
            ⚡ {t('generateBtn')}
          </button>
          <button className="btn btn-block" onClick={() => replace({ name: 'plans' })}>
            {t('myPlans')}
          </button>
        </>
      )}
    </main>
  );
}
