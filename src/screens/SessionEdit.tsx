import { useApp, useLive } from '../lib/app';
import { db } from '../lib/db';
import { Header, Stepper, WeightInput, fmtRest, LazyAnim } from '../components/ui';
import { getExercise, exName, EQUIP_LABEL } from '../data/catalog';
import type { PlanExercise, Session } from '../logic/types';

const REST_PRESETS = [60, 90, 120, 150, 180, 240];

function RestPicker({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const { t } = useApp();
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="rest-presets">
        {REST_PRESETS.map((p) => (
          <button key={p} type="button" className={`chip ${value === p ? 'on' : ''}`} onClick={() => onChange(p)}>
            {fmtRest(p, t)}
          </button>
        ))}
      </div>
      <Stepper value={value} step={15} min={15} max={600} onChange={onChange} format={(v) => fmtRest(v, t)} />
    </div>
  );
}

export function SessionEdit({ id }: { id: string }) {
  const { t, push, back, settings } = useApp();
  const session = useLive(() => db.sessions.get(id), [id]);
  if (!session) return null;

  const save = (patch: Partial<Session>) => db.sessions.put({ ...session, ...patch, updatedAt: Date.now() });
  const setEx = (i: number, patch: Partial<PlanExercise>) => {
    const exercises = session.exercises.map((e, j) => (j === i ? { ...e, ...patch } : e));
    void save({ exercises });
  };
  const move = (i: number, d: number) => {
    const ex = [...session.exercises];
    const j = i + d;
    if (j < 0 || j >= ex.length) return;
    [ex[i], ex[j]] = [ex[j], ex[i]];
    void save({ exercises: ex });
  };
  const remove = (i: number) => void save({ exercises: session.exercises.filter((_, j) => j !== i) });
  const removeSession = async () => {
    if (!confirm(t('deleteSessionQ'))) return;
    await db.sessions.delete(id);
    back();
  };

  return (
    <main className="screen">
      <Header title={session.name || t('newSession')} />

      <label className="field">
        <span className="field-label">{t('sessionName')}</span>
        <input
          className="input"
          value={session.name}
          placeholder={t('sessionNamePh')}
          maxLength={60}
          onChange={(e) => void save({ name: e.target.value })}
        />
      </label>

      <RestPicker label={t('restExercises')} value={session.restExercises} onChange={(v) => void save({ restExercises: v })} />

      <h2 className="section-title">{t('exercises')}</h2>
      {session.exercises.length === 0 && <p className="empty">{t('emptyPlan')}</p>}
      <ol className="plan-list">
        {session.exercises.map((pe, i) => {
          const ex = getExercise(pe.exerciseId);
          return (
            <li key={pe.uid} className="card plan-ex">
              <div className="plan-ex-head">
                {ex && <LazyAnim anim={ex.anim} equipment={ex.equipment} muscle={ex.muscles[0]} size={56} />}
                <div className="plan-ex-title">
                  <strong>
                    {i + 1}. {exName(ex, settings.lang)}
                  </strong>
                  {ex && <span className="muted">{EQUIP_LABEL[settings.lang][ex.equipment]}</span>}
                </div>
                <div className="plan-ex-tools">
                  <button className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t('moveUp')}>
                    ↑
                  </button>
                  <button className="icon-btn" onClick={() => move(i, 1)} disabled={i === session.exercises.length - 1} aria-label={t('moveDown')}>
                    ↓
                  </button>
                  <button className="icon-btn danger" onClick={() => remove(i)} aria-label={t('delete')}>
                    ✕
                  </button>
                </div>
              </div>
              <div className="plan-ex-grid">
                <Stepper label={t('sets')} value={pe.sets} min={1} max={20} onChange={(v) => setEx(i, { sets: v })} />
                <Stepper label={t('reps')} value={pe.reps} min={1} max={100} onChange={(v) => setEx(i, { reps: v })} />
                <WeightInput label={t('weight')} value={pe.weight} step={pe.step} onChange={(v) => setEx(i, { weight: v })} />
                <Stepper
                  label={t('restSets')}
                  value={pe.rest ?? 120}
                  step={15}
                  min={15}
                  max={600}
                  onChange={(v) => setEx(i, { rest: v })}
                  format={(v) => (v < 60 ? `${v} ${t('sec')}` : `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`)}
                />
                <Stepper
                  label={t('step')}
                  value={pe.step}
                  step={pe.step >= 2.5 ? 2.5 : 0.5}
                  min={0}
                  max={20}
                  onChange={(v) => setEx(i, { step: v })}
                  format={(v) => String(v).replace('.', ',')}
                />
              </div>
              {ex?.stepNote && <p className="step-note">{ex.repCap ? ex.capNote : ex.stepNote}</p>}
            </li>
          );
        })}
      </ol>

      <button className="btn btn-primary btn-block" onClick={() => push({ name: 'catalog', sessionId: id })}>
        + {t('addExercise')}
      </button>
      <button className="btn btn-ghost danger btn-block" onClick={removeSession}>
        {t('delete')}
      </button>
    </main>
  );
}
