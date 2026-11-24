import { useMemo, useState } from 'react';
import { useApp, useLive } from '../lib/app';
import { db, uid } from '../lib/db';
import { Header, Chips, Sheet, LazyAnim, fmtRest } from '../components/ui';
import { ExerciseAnim } from '../anim/ExerciseAnim';
import { allExercises, EQUIP_LABEL, GROUPS, GROUP_LABEL, exName, muscleLabel } from '../data/catalog';
import type { CatalogExercise, Equipment, MuscleGroup } from '../logic/types';

// Анимация по умолчанию для своих упражнений
const DEFAULT_ANIM: Record<MuscleGroup, string> = {
  chest: 'bench_press', back: 'row_bent', shoulders: 'press_overhead', biceps: 'curl', triceps: 'pushdown',
  forearms: 'wrist_curl', legs: 'squat_hold', glutes: 'hip_thrust', calves: 'calf_raise', abs: 'crunch', other: 'squat_hold',
};
const EQUIPS: Equipment[] = ['barbell', 'dumbbell', 'machine', 'cable', 'smith', 'ezbar', 'kettlebell', 'body'];

export function Catalog({ sessionId }: { sessionId?: string }) {
  const { t, settings } = useApp();
  const lang = settings.lang;
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<MuscleGroup | 'all'>('all');
  const [open, setOpen] = useState<CatalogExercise | null>(null);
  const [creating, setCreating] = useState(false);
  const session = useLive(() => (sessionId ? db.sessions.get(sessionId) : undefined), [sessionId]);
  const custom = useLive(() => db.custom.toArray(), []);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return allExercises().filter(
      (e) => (group === 'all' || e.group === group) && (!needle || e.ru.toLowerCase().includes(needle) || e.en.toLowerCase().includes(needle)),
    );
    // custom в зависимостях — чтобы новое своё упражнение сразу появилось
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, group, custom]);

  const countIn = (id: string) => session?.exercises.filter((e) => e.exerciseId === id).length ?? 0;

  const add = async (ex: CatalogExercise) => {
    if (!session) return;
    const isBody = ex.equipment === 'body';
    await db.sessions.put({
      ...session,
      exercises: [
        ...session.exercises,
        { uid: uid(), exerciseId: ex.id, sets: 3, reps: isBody ? 12 : 10, weight: 0, step: ex.step, rest: ex.rest ?? 120 },
      ],
      updatedAt: Date.now(),
    });
    setOpen(null);
  };

  return (
    <main className="screen">
      <Header title={t('catalog')} />
      <input className="input search" placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} type="search" />
      <Chips
        items={[{ id: 'all' as const, label: t('all') }, ...GROUPS.map((g) => ({ id: g, label: GROUP_LABEL[lang][g] }))]}
        value={group}
        onChange={setGroup}
      />
      <div className="catalog-grid">
        {list.map((ex) => {
          const n = countIn(ex.id);
          return (
            <button key={ex.id} className={`ex-card ${n ? 'in-plan' : ''}`} onClick={() => setOpen(ex)}>
              <LazyAnim anim={ex.anim} equipment={ex.equipment} size={88} />
              <span className="ex-card-name">{exName(ex, lang)}</span>
              <span className="ex-card-meta">{EQUIP_LABEL[lang][ex.equipment]}</span>
              {n > 0 && <span className="badge">✓</span>}
            </button>
          );
        })}
        <button className="ex-card ex-card-new" onClick={() => setCreating(true)}>
          <span className="plus">+</span>
          <span className="ex-card-name">{t('customExercise')}</span>
        </button>
      </div>

      <Sheet open={!!open} onClose={() => setOpen(null)}>
        {open && (
          <div className="ex-detail">
            <div className="ex-detail-anim">
              <ExerciseAnim anim={open.anim} equipment={open.equipment} size={220} />
            </div>
            <h2>{exName(open, lang)}</h2>
            {lang === 'ru' && <p className="muted small">{open.en}</p>}
            <dl className="ex-facts">
              <dt>{t('group')}</dt>
              <dd>{GROUP_LABEL[lang][open.group]}</dd>
              <dt>{t('equipment')}</dt>
              <dd>{EQUIP_LABEL[lang][open.equipment]}</dd>
              {open.muscles.length > 0 && (
                <>
                  <dt>{lang === 'ru' ? 'Мышцы' : 'Muscles'}</dt>
                  <dd>{open.muscles.map((m) => muscleLabel(m, lang)).join(', ')}</dd>
                </>
              )}
              <dt>{lang === 'ru' ? 'Шаг веса' : 'Weight step'}</dt>
              <dd>{open.step > 0 ? `${String(open.step).replace('.', ',')} ${t('kg')}` : lang === 'ru' ? 'повторами' : 'by reps'}</dd>
              <dt>{lang === 'ru' ? 'Отдых' : 'Rest'}</dt>
              <dd>{fmtRest(open.rest ?? 120, t)}</dd>
              <dt>{lang === 'ru' ? 'Тип' : 'Type'}</dt>
              <dd>{open.mechanic === 'compound' ? (lang === 'ru' ? 'базовое' : 'compound') : lang === 'ru' ? 'изолирующее' : 'isolation'}</dd>
            </dl>
            {open.stepNote && <p className="step-note">{open.stepNote}{open.capNote ? ` ${open.capNote}` : ''}</p>}
            {sessionId && (
              <button className="btn btn-primary btn-block" onClick={() => void add(open)}>
                {countIn(open.id) ? `${t('add')} (${t('added').toLowerCase()} ×${countIn(open.id)})` : t('add')}
              </button>
            )}
          </div>
        )}
      </Sheet>

      <Sheet open={creating} onClose={() => setCreating(false)}>
        <CustomForm
          onDone={async (ex) => {
            await db.custom.put(ex);
            setCreating(false);
            if (sessionId) await add(ex);
          }}
        />
      </Sheet>
    </main>
  );
}

function CustomForm({ onDone }: { onDone: (ex: CatalogExercise) => void }) {
  const { t, settings } = useApp();
  const lang = settings.lang;
  const [name, setName] = useState('');
  const [group, setGroup] = useState<MuscleGroup>('chest');
  const [equipment, setEquipment] = useState<Equipment>('machine');
  return (
    <form
      className="custom-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        const step = equipment === 'body' ? 0 : equipment === 'dumbbell' ? 2 : equipment === 'kettlebell' ? 4 : 2.5;
        onDone({
          id: `c_${uid()}`,
          ru: name.trim(),
          en: name.trim(),
          group,
          muscles: [],
          equipment,
          mechanic: 'compound',
          anim: DEFAULT_ANIM[group],
          step,
          rest: equipment === 'body' ? 90 : 120,
          custom: true,
        });
      }}
    >
      <h2>{t('customExercise')}</h2>
      <label className="field">
        <span className="field-label">{t('customName')}</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus />
      </label>
      <span className="field-label">{t('group')}</span>
      <Chips items={GROUPS.map((g) => ({ id: g, label: GROUP_LABEL[lang][g] }))} value={group} onChange={setGroup} />
      <span className="field-label">{t('equipment')}</span>
      <Chips items={EQUIPS.map((g) => ({ id: g, label: EQUIP_LABEL[lang][g] }))} value={equipment} onChange={setEquipment} />
      <button className="btn btn-primary btn-block" type="submit" disabled={!name.trim()}>
        {t('save')}
      </button>
    </form>
  );
}
