import { ExerciseAnim } from '../anim/ExerciseAnim';
import { animCues } from '../anim/cues';
import { CATALOG, GROUPS, GROUP_LABEL } from '../data/catalog';

// Служебная страница для проверки анимаций всех упражнений: откройте приложение с адресом #anims
export function AnimGallery() {
  return (
    <main className="screen" style={{ maxWidth: 1100 }}>
      <h1>Анимации упражнений ({CATALOG.length})</h1>
      {GROUPS.map((g) => (
        <section key={g}>
          <h2 className="section-title">{GROUP_LABEL.ru[g]}</h2>
          <div className="catalog-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))' }}>
            {CATALOG.filter((e) => e.group === g).map((ex) => (
              <div key={ex.id} className="ex-card" style={{ padding: 6 }}>
                <ExerciseAnim anim={ex.anim} equipment={ex.equipment} muscle={ex.muscles[0]} size={132} />
                <span className="ex-card-name" style={{ fontSize: 10.5 }}>{ex.ru}</span>
                <span className="ex-card-meta" style={{ fontSize: 9 }}>{ex.anim} · {ex.equipment}</span>
                <span className="ex-card-meta" style={{ fontSize: 9, color: 'var(--accent)' }}>{animCues(ex.anim, ex.equipment, ex.group, 'ru').join(' · ')}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
