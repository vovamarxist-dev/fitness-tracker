import { ExerciseAnim } from '../anim/ExerciseAnim';
import { PATTERNS } from '../anim/patterns';
import { CATALOG } from '../data/catalog';

// Служебная страница для проверки всех анимаций: откройте приложение с адресом #anims
export function AnimGallery() {
  const sample = (anim: string) => CATALOG.find((e) => e.anim === anim);
  return (
    <main className="screen" style={{ maxWidth: 960 }}>
      <h1>Анимации ({Object.keys(PATTERNS).length})</h1>
      <div className="catalog-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
        {Object.keys(PATTERNS).map((k) => {
          const ex = sample(k);
          return (
            <div key={k} className="ex-card">
              <ExerciseAnim anim={k} equipment={ex?.equipment ?? 'body'} size={100} />
              <span className="ex-card-meta">{k}</span>
              <span className="ex-card-name" style={{ fontSize: 11 }}>{ex?.ru}</span>
            </div>
          );
        })}
      </div>
    </main>
  );
}
