import { useApp, useLive } from '../lib/app';
import { db } from '../lib/db';
import { Header } from '../components/ui';
import { discipline } from '../logic/workout';
import { plural } from '../lib/i18n';
import type { WorkoutLog } from '../logic/types';

/** История всех завершённых тренировок, по месяцам */
export function History() {
  const { t, push, settings } = useApp();
  const lang = settings.lang;
  const logs = useLive(() => db.workouts.orderBy('startedAt').reverse().filter((w) => w.finishedAt != null).toArray(), []);
  if (!logs) return null;

  const months = new Map<string, WorkoutLog[]>();
  for (const l of logs) {
    const key = new Date(l.startedAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', year: 'numeric' });
    months.set(key, [...(months.get(key) ?? []), l]);
  }

  return (
    <main className="screen">
      <Header title={t('history')} />
      {logs.length === 0 && <p className="empty">{t('historyEmpty')}</p>}
      {logs.length > 0 && (
        <p className="muted center small">
          {plural(logs.length, lang, { ru: ['тренировка', 'тренировки', 'тренировок'], en: ['workout', 'workouts'] })}
        </p>
      )}
      {[...months.entries()].map(([month, list]) => (
        <section key={month} className="history-month">
          <h2 className="section-title">{month}</h2>
          <ul className="list">
            {list.map((l) => {
              const d = discipline(l);
              const done = l.entries.filter((e) => e.completedSets != null).length;
              const min = Math.max(1, Math.round(((l.finishedAt ?? l.startedAt) - l.startedAt) / 60000));
              const ups = l.entries.filter((e) => e.reco?.action === 'increase' || e.reco?.action === 'reps').length;
              return (
                <li key={l.id}>
                  <button className="card history-card" onClick={() => push({ name: 'summary', id: l.id })}>
                    <div className="history-date">
                      <span className="history-day">{new Date(l.startedAt).getDate()}</span>
                      <span className="muted small">
                        {new Date(l.startedAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short' })}
                      </span>
                    </div>
                    <div className="history-body">
                      <strong>{l.sessionName || t('newSession')}</strong>
                      <span className="muted small">
                        {done}/{l.entries.length} {t('exShort')} · {min} {t('min')}
                        {d ? ` · ${t('restShort')} ${d.percent}%` : ''}
                      </span>
                      {ups > 0 && <span className="history-up">↑ {t('progressIn', { n: ups })}</span>}
                    </div>
                    <span className="card-arrow">›</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
