import { useState } from 'react';
import { useApp, useLive } from '../lib/app';
import { db } from '../lib/db';
import { Header, Chips } from '../components/ui';
import { GOALS, SPLITS, generateSessions, type Goal } from '../logic/generator';
import { getExercise, exName } from '../data/catalog';
import { haptic } from '../lib/telegram';

/** Генерация плана по популярному сплиту */
export function Generate() {
  const { t, replace, settings } = useApp();
  const [splitId, setSplitId] = useState(SPLITS[0].id);
  const [goal, setGoal] = useState<Goal>('mass');
  const [replaceOld, setReplaceOld] = useState(false);
  const count = useLive(() => db.sessions.count(), []);
  const split = SPLITS.find((s) => s.id === splitId)!;

  const create = async () => {
    const existing = await db.sessions.orderBy('order').toArray();
    const keep = replaceOld ? [] : existing;
    const sessions = generateSessions(split, goal, (keep.at(-1)?.order ?? 0) + 1);
    await db.transaction('rw', db.sessions, async () => {
      if (replaceOld) await db.sessions.clear();
      await db.sessions.bulkPut(sessions);
    });
    haptic.done();
    replace({ name: 'plans' });
  };

  return (
    <main className="screen">
      <Header title={t('generate')} />
      <p className="muted small">{t('generateHint')}</p>

      <ul className="list split-list" role="radiogroup">
        {SPLITS.map((s) => (
          <li key={s.id}>
            <button className={`card split-card ${s.id === splitId ? 'on' : ''}`} role="radio" aria-checked={s.id === splitId} onClick={() => setSplitId(s.id)}>
              <div className="split-head">
                <strong>{s.name}</strong>
                <span className="split-days">{s.days}×</span>
              </div>
              <span className="muted small">{s.level}</span>
              {s.id === splitId && <span className="split-about">{s.about}</span>}
            </button>
          </li>
        ))}
      </ul>

      <section className="field">
        <span className="field-label">{t('goal')}</span>
        <Chips items={GOALS.map((g) => ({ id: g.id, label: g.name }))} value={goal} onChange={setGoal} />
        <span className="muted small">{GOALS.find((g) => g.id === goal)?.about}</span>
      </section>

      <section className="split-preview">
        {split.plan.map((d) => (
          <div key={d.name} className="split-day">
            <strong>{d.name}</strong>
            <span className="muted small">{[...d.main, ...d.acc].map((id) => exName(getExercise(id), settings.lang)).join(' · ')}</span>
          </div>
        ))}
      </section>

      {!!count && (
        <label className="toggle">
          <span>{t('replacePlans')}</span>
          <input type="checkbox" checked={replaceOld} onChange={(e) => setReplaceOld(e.target.checked)} />
        </label>
      )}

      <button className="btn btn-primary btn-block btn-xl" onClick={() => void create()}>
        {t('generateDo', { n: split.days })}
      </button>
    </main>
  );
}
