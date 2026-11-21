import { memo } from 'react';
import { PATTERNS, type Attach, type Pattern, type Pose, type Pt } from './patterns';
import type { Equipment } from '../logic/types';

// Рисует анимированную фигурку упражнения. Анимация — SMIL внутри SVG: без JS и без нагрузки
// на React, поэтому в каталоге можно показывать десятки карточек одновременно.
//
// anim = 'движение+модификатор+модификатор', например 'curl+alt', 'bench_press+decline+rails'.
// Модификаторы:
//   wide / close / vclose — ширина хвата (вид спереди)
//   alt — руки попеременно; one — работает одна рука (нога), вторая неподвижна
//   seated — сидя на скамье; onback — штанга на плечах
//   incline / decline — наклон скамьи; rails — направляющие Смита; box — ящик под таз
//   support — упор грудью/головой в наклонную скамью; assist — упор коленями (гравитрон)
//   lever — Т-гриф (рычаг от пола); deficit — стоя на платформе
//   slow / fast / pause — темп; pause — задержка в нижней точке

type Phase = 'normal' | 'alt' | 'static';
type Shape =
  | { tag: 'line'; cls: string; ph?: Phase; x1: number; y1: number; x2: number; y2: number }
  | { tag: 'polyline'; cls: string; ph?: Phase; points: string }
  | { tag: 'circle'; cls: string; ph?: Phase; cx: number; cy: number; r: number };

const mirror = ([x, y]: Pt): Pt => [100 - x, y];
const pts = (list: Pt[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
const add = ([x, y]: Pt, [dx, dy]: Pt): Pt => [x + dx, y + dy];

function toe(k: Pt, a: Pt, side: 'side' | 'L' | 'R'): Pt {
  if (side === 'L') return [a[0] - 4, a[1] + 1];
  if (side === 'R') return [a[0] + 4, a[1] + 1];
  const dx = a[0] - k[0];
  const dy = a[1] - k[1];
  const len = Math.hypot(dx, dy) || 1;
  return [a[0] + (6 * dy) / len, a[1] - (6 * dx) / len];
}

interface Spec {
  pat: Pattern;
  mods: Set<string>;
}

export function parseAnim(anim: string): Spec | null {
  const [base, ...mods] = anim.split('+');
  const pat = PATTERNS[base];
  return pat ? { pat, mods: new Set(mods) } : null;
}

/** Применяет модификаторы, меняющие позу */
function transformPose(pose: Pose, pat: Pattern, mods: Set<string>): Pose {
  let p: Pose = { ...pose };
  const shift = (dy: number, keys: (keyof Pose)[]) => {
    for (const k of keys) if (p[k]) p[k] = add(p[k]!, [0, dy]);
  };
  if (mods.has('seated') && p.p && p.p[1] < 58) {
    shift(18, ['h', 'n', 'e', 'w', 'e2', 'w2', 'p']);
    const hip = p.p!;
    if (pat.view === 'side') {
      p = { ...p, k: [hip[0] + 19, hip[1]], a: [hip[0] + 20, 90], t: undefined, k2: undefined, a2: undefined, t2: undefined };
    } else {
      p = { ...p, k: [hip[0] - 10, hip[1] + 7], a: [hip[0] - 11, 90] };
    }
  }
  if (mods.has('onback') && p.n) {
    const n = p.n;
    if (pat.view === 'side') p = { ...p, e: [n[0] - 8, n[1] + 10], w: [n[0] - 3, n[1] + 2] };
    else p = { ...p, e: [n[0] - 14, n[1] + 8], w: [n[0] - 13, n[1]] };
  }
  if (mods.has('deficit')) shift(-4, ['h', 'n', 'e', 'w', 'e2', 'w2', 'p', 'k', 'a', 't', 'k2', 'a2', 't2']);
  if (pat.view === 'front') {
    const grip = mods.has('wide') ? [1.15, 1.32] : mods.has('close') ? [0.9, 0.62] : mods.has('vclose') ? [0.82, 0.3] : null;
    if (grip) {
      const sx = (pt: Pt | undefined, f: number): Pt | undefined => (pt ? [50 + (pt[0] - 50) * f, pt[1]] : pt);
      p = { ...p, e: sx(p.e, grip[0]), w: sx(p.w, grip[1]) };
    }
  }
  return p;
}

function shapesFor(pose: Pose, pat: Pattern, equipment: Equipment, mods: Set<string>): Shape[] {
  const s: Shape[] = [];
  const { h, n, p, e, w, k, a } = pose as Required<Pose>;
  const poly = (cls: string, list: Pt[], ph?: Phase) => s.push({ tag: 'polyline', cls, points: pts(list), ph });
  const second: Phase = mods.has('one') ? 'static' : mods.has('alt') ? 'alt' : 'normal';
  const attach: Attach = mods.has('onback') ? 'neck' : pat.attach ?? 'hands';

  // Точки крепления снаряда и фаза движения каждой
  let grips: { pt: Pt; ph: Phase }[] = [];

  if (pat.view === 'side') {
    const e2 = pose.e2 ?? e;
    const w2 = pose.w2 ?? w;
    const k2 = pose.k2 ?? k;
    const a2 = pose.a2 ?? a;
    const t = pose.t ?? toe(k, a, 'side');
    const t2 = pose.t2 ?? (pose.k2 ? toe(k2, a2, 'side') : t);
    // Дальняя нога: при «one» неподвижна, только если в позах её отдельно не задали
    poly('limb far', [p, k2, a2, t2], mods.has('one') && !pose.k2 ? 'static' : 'normal');
    poly('limb far', [n, e2, w2], pose.e2 ? 'normal' : second);
    poly('torso', [n, p]);
    poly('limb', [p, k, a, t]);
    poly('limb', [n, e, w]);
    s.push({ tag: 'circle', cls: 'head', cx: h[0], cy: h[1], r: 5.5 });
    if (attach === 'neck') grips = [{ pt: n, ph: 'normal' }];
    else if (attach === 'platform' || attach === 'pad') grips = [{ pt: a, ph: 'normal' }];
    else if (attach === 'knee') grips = [{ pt: k, ph: 'normal' }];
    else if (attach === 'ankle2') grips = [{ pt: a2, ph: 'normal' }];
    else {
      grips = [{ pt: w, ph: 'normal' }];
      // Попеременная работа: снаряд и в дальней руке
      if (second === 'alt' && !pose.e2 && equipment !== 'barbell' && equipment !== 'smith' && equipment !== 'ezbar') grips.push({ pt: w2, ph: 'alt' });
    }
  } else {
    const lS = add(n, [-7, 1]);
    const rS = mirror(lS);
    const lH = add(p, [-4, 0]);
    const rH = mirror(lH);
    poly('torso', [n, p]);
    poly('torso', [lS, rS]);
    poly('torso', [lH, rH]);
    poly('limb', [lH, k, a, toe(k, a, 'L')]);
    poly('limb', [rH, mirror(k), mirror(a), toe(mirror(k), mirror(a), 'R')]);
    poly('limb', [lS, e, w]);
    poly('limb', [rS, mirror(e), mirror(w)], second);
    s.push({ tag: 'circle', cls: 'head', cx: h[0], cy: h[1], r: 5.5 });
    grips =
      attach === 'neck'
        ? [{ pt: add(lS, [-5, 0]), ph: 'normal' }, { pt: add(rS, [5, 0]), ph: 'normal' }]
        : attach === 'knee'
          ? [{ pt: k, ph: 'normal' }, { pt: mirror(k), ph: 'normal' }]
          : [{ pt: w, ph: 'normal' }, { pt: mirror(w), ph: second }];
  }

  if (mods.has('assist')) {
    s.push({ tag: 'circle', cls: 'pad', cx: k[0], cy: k[1] + 2, r: 3.2 });
    if (pat.view === 'front') s.push({ tag: 'circle', cls: 'pad', cx: 100 - k[0], cy: k[1] + 2, r: 3.2 });
  }

  // Снаряд
  const barLike = equipment === 'barbell' || equipment === 'smith' || equipment === 'ezbar';
  const propShapes: Shape[] = [];
  const both = grips.length === 2 && grips[1].ph === 'normal';
  if (pat.view === 'front' && (barLike || pat.bar) && both) {
    const [l, r] = [grips[0].pt, grips[1].pt];
    if (barLike) {
      propShapes.push({ tag: 'line', cls: 'bar', x1: l[0] - 13, y1: l[1], x2: r[0] + 13, y2: r[1] });
      propShapes.push({ tag: 'line', cls: 'plate-edge', x1: l[0] - 10, y1: l[1] - 7, x2: l[0] - 10, y2: l[1] + 7 });
      propShapes.push({ tag: 'line', cls: 'plate-edge', x1: r[0] + 10, y1: r[1] - 7, x2: r[0] + 10, y2: r[1] + 7 });
    } else {
      propShapes.push({ tag: 'line', cls: 'bar', x1: l[0] - 3, y1: l[1], x2: r[0] + 3, y2: r[1] });
      if (equipment === 'cable' || pat.anchor) {
        const anc = pat.anchor ?? [50, 0];
        propShapes.push({ tag: 'line', cls: 'cable', x1: (l[0] + r[0]) / 2, y1: l[1], x2: anc[0], y2: anc[1] });
      }
    }
  } else {
    for (const [i, { pt: g, ph }] of grips.entries()) {
      // В одноручных упражнениях вторая рука пустая
      if (ph === 'static' && attach === 'hands') continue;
      const push = (sh: Shape) => propShapes.push({ ...sh, ph });
      switch (equipment) {
        case 'barbell':
        case 'smith':
        case 'ezbar':
          push({ tag: 'circle', cls: 'plate', cx: g[0], cy: g[1], r: 8 });
          push({ tag: 'circle', cls: 'hub', cx: g[0], cy: g[1], r: 1.6 });
          break;
        case 'dumbbell':
          push({ tag: 'circle', cls: 'dumbbell', cx: g[0], cy: g[1], r: 3.6 });
          break;
        case 'kettlebell':
          push({ tag: 'circle', cls: 'dumbbell', cx: g[0], cy: g[1] + 4.5, r: 4.5 });
          break;
        case 'cable': {
          const base = pat.anchor ?? [92, 10];
          const anc = pat.view === 'front' && i === 1 ? mirror(base) : base;
          push({ tag: 'line', cls: 'cable', x1: g[0], y1: g[1], x2: anc[0], y2: anc[1] });
          push({ tag: 'circle', cls: 'hub', cx: g[0], cy: g[1], r: 1.8 });
          break;
        }
        case 'machine': {
          if (attach === 'platform') {
            const kk = pose.k as Pt;
            const dx = g[0] - kk[0];
            const dy = g[1] - kk[1];
            const len = Math.hypot(dx, dy) || 1;
            const px = (-dy / len) * 8;
            const py = (dx / len) * 8;
            const cx = g[0] + (dx / len) * 3;
            const cy = g[1] + (dy / len) * 3;
            push({ tag: 'line', cls: 'platform', x1: cx - px, y1: cy - py, x2: cx + px, y2: cy + py });
          } else if (attach === 'hands' || attach === 'neck') {
            push({ tag: 'line', cls: 'platform', x1: g[0], y1: g[1] - 4, x2: g[0], y2: g[1] + 4 });
          } else {
            push({ tag: 'circle', cls: 'pad', cx: g[0], cy: g[1], r: 3.4 });
          }
          break;
        }
        default:
          break;
      }
    }
  }
  if (mods.has('lever') && grips[0]) {
    const g = grips[0].pt;
    propShapes.push({ tag: 'line', cls: 'bar', x1: g[0], y1: g[1], x2: 8, y2: 90 });
  }
  return pat.behind ? [...propShapes, ...s] : [...s, ...propShapes];
}

/** Неподвижные элементы, зависящие от модификаторов */
function extraScene(pat: Pattern, mods: Set<string>, poseA: Pose): string {
  let d = '';
  if (mods.has('seated') && poseA.p) {
    const [x, y] = poseA.p;
    d += pat.view === 'side' ? ` M${x - 12} ${y + 4} H${x + 12} M${x} ${y + 4} V91` : ` M${x - 16} ${y + 4} H${x + 16} M${x} ${y + 4} V91`;
  }
  if (mods.has('rails')) {
    if (pat.view === 'side') {
      const g = (mods.has('onback') || pat.attach === 'neck' ? poseA.n : poseA.w) as Pt;
      d += ` M${g[0] + 10} 2 V91`;
    } else {
      const w = (mods.has('onback') ? poseA.n : poseA.w) as Pt;
      const x = Math.min(w[0], 100 - w[0]) - 18;
      d += ` M${x} 2 V91 M${100 - x} 2 V91`;
    }
  }
  if (mods.has('box')) d += ' M28 71 H46 V91 M28 71 V91';
  if (mods.has('support')) d += ' M40 61 L76 45 M54 55 L52 91';
  if (mods.has('deficit')) d += ' M30 88 H70 V91 M30 88 V91';
  return d.trim();
}

function timing(pat: Pattern, mods: Set<string>) {
  const dur = mods.has('slow') ? 3.6 : mods.has('fast') ? 1.6 : pat.dur ?? 2.6;
  if (mods.has('pause')) return { dur, keyTimes: '0;0.4;0.65;1', keySplines: '0.45 0 0.55 1;0 0 1 1;0.45 0 0.55 1', pause: true };
  return { dur, keyTimes: '0;0.5;1', keySplines: '0.45 0 0.55 1;0.45 0 0.55 1', pause: false };
}

type Timing = ReturnType<typeof timing>;

function Anim({ attr, a, b, tm, ph }: { attr: string; a: string | number; b: string | number; tm: Timing; ph?: Phase }) {
  if (a === b || ph === 'static') return null;
  return (
    <animate
      attributeName={attr}
      values={tm.pause ? `${a};${b};${b};${a}` : `${a};${b};${a}`}
      keyTimes={tm.keyTimes}
      dur={`${tm.dur}s`}
      begin={ph === 'alt' ? `-${tm.dur / 2}s` : '0s'}
      repeatCount="indefinite"
      calcMode="spline"
      keySplines={tm.keySplines}
    />
  );
}

function renderPair(A: Shape, B: Shape, key: number, tm: Timing) {
  const ph = A.ph;
  if (A.tag === 'line' && B.tag === 'line') {
    return (
      <line key={key} className={A.cls} x1={A.x1} y1={A.y1} x2={A.x2} y2={A.y2}>
        <Anim attr="x1" a={A.x1} b={B.x1} tm={tm} ph={ph} />
        <Anim attr="y1" a={A.y1} b={B.y1} tm={tm} ph={ph} />
        <Anim attr="x2" a={A.x2} b={B.x2} tm={tm} ph={ph} />
        <Anim attr="y2" a={A.y2} b={B.y2} tm={tm} ph={ph} />
      </line>
    );
  }
  if (A.tag === 'polyline' && B.tag === 'polyline') {
    return (
      <polyline key={key} className={A.cls} points={A.points}>
        <Anim attr="points" a={A.points} b={B.points} tm={tm} ph={ph} />
      </polyline>
    );
  }
  if (A.tag === 'circle' && B.tag === 'circle') {
    return (
      <circle key={key} className={A.cls} cx={A.cx} cy={A.cy} r={A.r}>
        <Anim attr="cx" a={A.cx} b={B.cx} tm={tm} ph={ph} />
        <Anim attr="cy" a={A.cy} b={B.cy} tm={tm} ph={ph} />
      </circle>
    );
  }
  return null;
}

export const ExerciseAnim = memo(function ExerciseAnim({
  anim,
  equipment,
  size = 96,
  still = false,
}: {
  anim: string;
  equipment: Equipment;
  size?: number;
  still?: boolean;
}) {
  const spec = parseAnim(anim);
  if (!spec) return <div className="anim-missing" style={{ width: size, height: size }} />;
  const { pat, mods } = spec;
  const poseA = transformPose(pat.A, pat, mods);
  const poseB = transformPose(pat.B, pat, mods);
  const A = shapesFor(poseA, pat, equipment, mods);
  const B = shapesFor(poseB, pat, equipment, mods);
  const tm = timing(pat, mods);
  const scene = [pat.scene, extraScene(pat, mods, poseA)].filter(Boolean).join(' ');

  // Наклон скамьи: поворачиваем фигуру вместе со скамьёй (incline — вокруг таза, decline — вокруг головы)
  const tilt = mods.has('incline') ? { deg: 22, at: poseA.p } : mods.has('decline') ? { deg: -14, at: poseA.h } : null;
  const body = (
    <>
      {scene && <path className="scene" d={scene} />}
      {A.map((sa, i) => (still ? renderPair(sa, sa, i, tm) : renderPair(sa, B[i], i, tm)))}
    </>
  );
  return (
    <svg className="exercise-anim" viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <line className="floor" x1="2" y1="92" x2="98" y2="92" />
      {tilt?.at ? <g transform={`rotate(${tilt.deg} ${tilt.at[0]} ${tilt.at[1]})`}>{body}</g> : body}
    </svg>
  );
});
