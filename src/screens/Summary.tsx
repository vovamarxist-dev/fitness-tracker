import { useApp, useLive } from '../lib/app';
import { db } from '../lib/db';
import { Header } from '../components/ui';
import { getExercise, exName } from '../data/catalog';
import { applyToPlan, discipline } from '../logic/workout';
import { fmtKg } from '../logic/progression';
import { fmtDuration } from '../lib/i18n';
import type { RecoAction, WorkoutEntry } from '../logic/types';


const ACTION_ICON: Record<RecoAction, string> = {
  increase: '↑',
  reps: '↑',
  hold: '=',
  decrease: '↓',
  reset: '↺',
  break: '↓',
  stall: '!',
};

/** «10×80 · 10×80 · 8×75 кг» или «12 · 12 · 10» для своего веса */
export function setsLine(e: WorkoutEntry, kg: string, noWeight: string) {
  if (!e.setReps?.length) return `${e.completedSets}/${e.plannedSets} × ${e.reps} · ${e.weight > 0 ? `${fmtKg(e.weight)} ${kg}` : noWeight}`;
  const ws = e.setWeights;
  if (!ws?.some((w) => w > 0)) return e.setReps.join(' · ');
  return `${e.setReps.map((r, i) => `${r}×${fmtKg(ws[i] ?? e.weight)}`).join(' · ')} ${kg}`;
}

export function Summary({ id }: { id: string }) {
  const { t, reset, settings } = useApp();
  const log = useLive(() => db.workouts.get(id), [id]);
  if (!log) return null;
  const lang = settings.lang;
  const disc = discipline(log);
  const dur = ((log.finishedAt ?? Date.now()) - log.startedAt) / 1000;
  const withReco = log.entries.filter((e) => e.reco);

  return (
    <main className="screen">
      <Header title={t('summary')} />
      <p className="muted center">
        {log.sessionName} · {new Date(log.startedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
      </p>

      <div className="stats">
        <div className="stat">
          <span className="stat-value">{Math.max(1, Math.round(dur / 60))}</span>
          <span className="muted">
            {t('duration')}, {t('min')}
          </span>
        </div>
        {disc && (
          <div className={`stat ${disc.percent >= 80 ? 'good' : disc.percent >= 50 ? 'mid' : 'bad'}`}>
            <span className="stat-value">{disc.percent}%</span>
            <span className="muted">
              {t('restDiscipline')}: {disc.onTime}/{disc.total} {t('onTime')}
            </span>
          </div>
        )}
        {disc && (
          <div className="stat">
            <span className="stat-value">+{fmtDuration(disc.avgOver)}</span>
            <span className="muted">{t('avgOver')}</span>
          </div>
        )}
      </div>

      <h2 className="section-title">{t('recommendations')}</h2>
      <ul className="list">
        {log.entries.map((e) => {
          const ex = getExercise(e.exerciseId);
          return (
            <li key={e.uid} className={`card reco reco-${e.reco?.action ?? 'skip'}`}>
              <div className="reco-head">
                <span className="reco-icon">{e.reco ? ACTION_ICON[e.reco.action] : '–'}</span>
                <div>
                  <strong>{exName(ex, lang)}</strong>
                  <span className="muted small">
                    {e.completedSets == null
                      ? t('skipped')
                      : setsLine(e, t('kg'), t('noWeight'))}
                  </span>
                </div>
                {e.reco && e.reco.nextWeight !== e.weight && <span className="reco-next">{fmtKg(e.reco.nextWeight)} {t('kg')}</span>}
                {e.reco && e.reco.nextReps !== e.reps && <span className="reco-next">× {e.reco.nextReps}</span>}
              </div>
              {e.reco?.messages.map((m, i) => (
                <p key={i} className="reco-msg">
                  {m}
                </p>
              ))}
            </li>
          );
        })}
      </ul>

      {withReco.length > 0 &&
        (log.applied ? (
          <p className="applied">✓ {t('appliedToPlan')}</p>
        ) : (
          <button className="btn btn-primary btn-block" onClick={() => void applyToPlan(log)}>
            {t('applyToPlan')}
          </button>
        ))}
      <button className="btn btn-block" onClick={() => reset()}>
        {t('toHome')}
      </button>
    </main>
  );
}
