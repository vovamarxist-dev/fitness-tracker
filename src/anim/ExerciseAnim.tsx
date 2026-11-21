import { memo } from 'react';
import { PATTERNS, type Pattern, type Pose, type Pt } from './patterns';
import type { Equipment } from '../logic/types';

// Рисует анимированную фигурку упражнения. Анимация — SMIL внутри SVG: без JS и без нагрузки
// на React, поэтому в каталоге можно показывать десятки карточек одновременно.

type Shape =
  | { tag: 'line'; cls: string; x1: number; y1: number; x2: number; y2: number }
  | { tag: 'polyline'; cls: string; points: string }
  | { tag: 'circle'; cls: string; cx: number; cy: number; r: number };

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

function shapesFor(pose: Pose, pat: Pattern, equipment: Equipment): Shape[] {
  const s: Shape[] = [];
  const { h, n, p, e, w, k, a } = pose as Required<Pose>;
  const poly = (cls: string, list: Pt[]) => s.push({ tag: 'polyline', cls, points: pts(list) });

  // Точки, к которым крепится снаряд
  let grips: Pt[] = [];

  if (pat.view === 'side') {
    const e2 = pose.e2 ?? e;
    const w2 = pose.w2 ?? w;
    const k2 = pose.k2 ?? k;
    const a2 = pose.a2 ?? a;
    const t = pose.t ?? toe(k, a, 'side');
    const t2 = pose.t2 ?? (pose.k2 ? toe(k2, a2, 'side') : t);
    poly('limb far', [p, k2, a2, t2]);
    poly('limb far', [n, e2, w2]);
    poly('torso', [n, p]);
    poly('limb', [p, k, a, t]);
    poly('limb', [n, e, w]);
    s.push({ tag: 'circle', cls: 'head', cx: h[0], cy: h[1], r: 5.5 });
    const at = pat.attach ?? 'hands';
    grips =
      at === 'neck' ? [n] : at === 'platform' || at === 'pad' ? [a] : at === 'knee' ? [k] : at === 'ankle2' ? [a2] : [w];
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
    poly('limb', [rS, mirror(e), mirror(w)]);
    s.push({ tag: 'circle', cls: 'head', cx: h[0], cy: h[1], r: 5.5 });
    const at = pat.attach ?? 'hands';
    grips = at === 'neck' ? [lS, rS] : at === 'knee' ? [k, mirror(k)] : [w, mirror(w)];
  }

  // Снаряд
  const barLike = equipment === 'barbell' || equipment === 'smith' || equipment === 'ezbar';
  if (pat.view === 'front' && (barLike || pat.bar) && grips.length === 2) {
    const [l, r] = grips;
    if (barLike) {
      s.push({ tag: 'line', cls: 'bar', x1: l[0] - 13, y1: l[1], x2: r[0] + 13, y2: r[1] });
      s.push({ tag: 'line', cls: 'plate-edge', x1: l[0] - 10, y1: l[1] - 7, x2: l[0] - 10, y2: l[1] + 7 });
      s.push({ tag: 'line', cls: 'plate-edge', x1: r[0] + 10, y1: r[1] - 7, x2: r[0] + 10, y2: r[1] + 7 });
    } else {
      s.push({ tag: 'line', cls: 'bar', x1: l[0] - 3, y1: l[1], x2: r[0] + 3, y2: r[1] });
      if (equipment === 'cable' || pat.anchor) {
        const anc = pat.anchor ?? [50, 0];
        s.push({ tag: 'line', cls: 'cable', x1: (l[0] + r[0]) / 2, y1: l[1], x2: anc[0], y2: anc[1] });
      }
    }
    return s;
  }

  for (const [i, g] of grips.entries()) {
    switch (equipment) {
      case 'barbell':
      case 'smith':
      case 'ezbar':
        s.push({ tag: 'circle', cls: 'plate', cx: g[0], cy: g[1], r: 8 });
        s.push({ tag: 'circle', cls: 'hub', cx: g[0], cy: g[1], r: 1.6 });
        break;
      case 'dumbbell':
        s.push({ tag: 'circle', cls: 'dumbbell', cx: g[0], cy: g[1], r: 3.6 });
        break;
      case 'kettlebell':
        s.push({ tag: 'circle', cls: 'dumbbell', cx: g[0], cy: g[1] + 4.5, r: 4.5 });
        break;
      case 'cable': {
        const base = pat.anchor ?? [92, 10];
        const anc = pat.view === 'front' && i === 1 ? mirror(base) : base;
        s.push({ tag: 'line', cls: 'cable', x1: g[0], y1: g[1], x2: anc[0], y2: anc[1] });
        s.push({ tag: 'circle', cls: 'hub', cx: g[0], cy: g[1], r: 1.8 });
        break;
      }
      case 'machine': {
        const at = pat.attach ?? 'hands';
        if (at === 'platform') {
          const k = pose.k as Pt;
          const dx = g[0] - k[0];
          const dy = g[1] - k[1];
          const len = Math.hypot(dx, dy) || 1;
          const px = (-dy / len) * 8;
          const py = (dx / len) * 8;
          s.push({ tag: 'line', cls: 'platform', x1: g[0] + dx / len * 3 - px, y1: g[1] + dy / len * 3 - py, x2: g[0] + dx / len * 3 + px, y2: g[1] + dy / len * 3 + py });
        } else if (at === 'hands') {
          s.push({ tag: 'line', cls: 'platform', x1: g[0], y1: g[1] - 4, x2: g[0], y2: g[1] + 4 });
        } else {
          s.push({ tag: 'circle', cls: 'pad', cx: g[0], cy: g[1], r: 3.4 });
        }
        break;
      }
      default:
        break;
    }
  }
  return s;
}

const DUR = '2.6s';
const SPLINE = '0.45 0 0.55 1;0.45 0 0.55 1';

function Anim({ attr, a, b }: { attr: string; a: string | number; b: string | number }) {
  if (a === b) return null;
  return (
    <animate
      attributeName={attr}
      values={`${a};${b};${a}`}
      keyTimes="0;0.5;1"
      dur={DUR}
      repeatCount="indefinite"
      calcMode="spline"
      keySplines={SPLINE}
    />
  );
}

function renderPair(A: Shape, B: Shape, key: number) {
  if (A.tag === 'line' && B.tag === 'line') {
    return (
      <line key={key} className={A.cls} x1={A.x1} y1={A.y1} x2={A.x2} y2={A.y2}>
        <Anim attr="x1" a={A.x1} b={B.x1} />
        <Anim attr="y1" a={A.y1} b={B.y1} />
        <Anim attr="x2" a={A.x2} b={B.x2} />
        <Anim attr="y2" a={A.y2} b={B.y2} />
      </line>
    );
  }
  if (A.tag === 'polyline' && B.tag === 'polyline') {
    return (
      <polyline key={key} className={A.cls} points={A.points}>
        <Anim attr="points" a={A.points} b={B.points} />
      </polyline>
    );
  }
  if (A.tag === 'circle' && B.tag === 'circle') {
    return (
      <circle key={key} className={A.cls} cx={A.cx} cy={A.cy} r={A.r}>
        <Anim attr="cx" a={A.cx} b={B.cx} />
        <Anim attr="cy" a={A.cy} b={B.cy} />
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
  const pat = PATTERNS[anim];
  if (!pat) return <div className="anim-missing" style={{ width: size, height: size }} />;
  const A = shapesFor(pat.A, pat, equipment);
  const B = shapesFor(pat.B, pat, equipment);
  return (
    <svg className="exercise-anim" viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <line className="floor" x1="2" y1="92" x2="98" y2="92" />
      {pat.scene && <path className="scene" d={pat.scene} />}
      {A.map((sa, i) => (still ? renderPair(sa, sa, i) : renderPair(sa, B[i], i)))}
    </svg>
  );
});
