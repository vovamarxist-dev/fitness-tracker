import { memo, useId } from 'react';
import { PATTERNS, type Attach, type Pattern, type Pose, type Pt } from './patterns';
import type { Equipment } from '../logic/types';

// Рисует анимированную фигурку упражнения. Анимация — SMIL внутри SVG: без JS и без нагрузки
// на React, поэтому в каталоге можно показывать десятки карточек одновременно.
//
// Что видно на анимации:
//  • фигура и снаряд (гриф, гантели, гиря, рукояти блока);
//  • тренажёр с механикой: блочная стойка с грузоблоком, который поднимается вместе с движением,
//    трос через ролики; рычаг с осью вращения; блины на рычаге; салазки жима ногами;
//  • подсветка работающей мышцы и пунктир траектории со стрелками — куда и по какой дуге двигаться;
//  • короткие паузы в крайних точках, чтобы было видно начало и конец движения.
//
// anim = 'движение+модификатор+модификатор', например 'curl+alt', 'bench_press+decline+rails'.
// Модификаторы:
//   wide / close / vclose — ширина хвата (вид спереди)
//   under / over / neutral — обратный, прямой, нейтральный хват (neutral меняет положение гантели)
//   rope / vbar — насадка блока: канат, V-рукоять
//   alt — руки попеременно; one — работает одна рука (нога), вторая неподвижна
//   seated — сидя на скамье; onback — штанга на плечах
//   incline / decline — наклон скамьи; rails — направляющие Смита; box — ящик под таз
//   support — упор грудью/головой в наклонную скамью; assist — упор коленями (гравитрон)
//   lever — Т-гриф (рычаг от пола); deficit — стоя на платформе; plates — рычажный тренажёр с блинами
//   slow / fast / pause — темп; pause — задержка в крайней точке

type Phase = 'normal' | 'alt' | 'static';
type Shape =
  | { tag: 'line'; cls: string; ph?: Phase; x1: number; y1: number; x2: number; y2: number }
  | { tag: 'polyline'; cls: string; ph?: Phase; points: string }
  | { tag: 'circle'; cls: string; ph?: Phase; cx: number; cy: number; r: number }
  | { tag: 'rect'; cls: string; ph?: Phase; x: number; y: number; w: number; h: number };

// ---------- геометрия ----------
const mirror = ([x, y]: Pt): Pt => [100 - x, y];
const pts = (list: Pt[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
const add = ([x, y]: Pt, [dx, dy]: Pt): Pt => [x + dx, y + dy];
const sub = ([x, y]: Pt, [x2, y2]: Pt): Pt => [x - x2, y - y2];
const mul = ([x, y]: Pt, k: number): Pt => [x * k, y * k];
const len = ([x, y]: Pt) => Math.hypot(x, y);
const unit = (v: Pt): Pt => {
  const l = len(v) || 1;
  return [v[0] / l, v[1] / l];
};
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** Поворот на 90° (в экранных координатах): для фигуры, смотрящей вправо, даёт «вперёд» из вектора таз→шея */
const rot = ([x, y]: Pt): Pt => [-y, x];
const dot = (a: Pt, b: Pt) => a[0] * b[0] + a[1] * b[1];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const f1 = (n: number) => Number(n.toFixed(1));

function toe(k: Pt, a: Pt, side: 'side' | 'L' | 'R'): Pt {
  if (side === 'L') return [a[0] - 4, a[1] + 1];
  if (side === 'R') return [a[0] + 4, a[1] + 1];
  const dx = a[0] - k[0];
  const dy = a[1] - k[1];
  const l = Math.hypot(dx, dy) || 1;
  return [a[0] + (6 * dy) / l, a[1] - (6 * dx) / l];
}

interface Spec {
  pat: Pattern;
  mods: Set<string>;
}

export function parseAnim(anim: string, equipment?: Equipment): Spec | null {
  const [base, ...mods] = anim.split('+');
  const raw = PATTERNS[base];
  if (!raw) return null;
  // У тренажёрного варианта может быть своя поза/крепление (например, отжимания в тренажёре)
  const pat = equipment === 'machine' && raw.machine ? { ...raw, ...raw.machine } : raw;
  return { pat, mods: new Set(mods) };
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

function rotatePose(pose: Pose, deg: number, [cx, cy]: Pt): Pose {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const sn = Math.sin(r);
  const out: Pose = {};
  for (const [k, v] of Object.entries(pose) as [keyof Pose, Pt | undefined][]) {
    if (!v) continue;
    const dx = v[0] - cx;
    const dy = v[1] - cy;
    out[k] = [cx + dx * c - dy * sn, cy + dx * sn + dy * c];
  }
  return out;
}

// ---------- точки хвата ----------
interface Grip {
  pt: Pt;
  ph: Phase;
}

function attachOf(pat: Pattern, mods: Set<string>): Attach {
  return mods.has('onback') ? 'neck' : pat.attach ?? 'hands';
}

function secondPhase(mods: Set<string>): Phase {
  return mods.has('one') ? 'static' : mods.has('alt') ? 'alt' : 'normal';
}

function gripsOf(pose: Pose, pat: Pattern, mods: Set<string>, equipment: Equipment): Grip[] {
  const { n, p, w, k, a } = pose as Required<Pose>;
  const attach = attachOf(pat, mods);
  const second = secondPhase(mods);
  if (pat.view === 'side') {
    if (attach === 'neck') return [{ pt: n, ph: 'normal' }];
    if (attach === 'hip') return [{ pt: p, ph: 'normal' }];
    if (attach === 'platform' || attach === 'pad') return [{ pt: a, ph: 'normal' }];
    if (attach === 'knee') return [{ pt: k, ph: 'normal' }];
    if (attach === 'ankle2') return [{ pt: pose.a2 ?? a, ph: 'normal' }];
    const grips: Grip[] = [{ pt: w, ph: 'normal' }];
    const barLike = equipment === 'barbell' || equipment === 'smith' || equipment === 'ezbar';
    if (second === 'alt' && !pose.e2 && !barLike && equipment !== 'cable' && equipment !== 'machine') grips.push({ pt: pose.w2 ?? w, ph: 'alt' });
    return grips;
  }
  const lS = add(n, [-7, 1]);
  if (attach === 'neck') return [{ pt: add(lS, [-5, 0]), ph: 'normal' }, { pt: add(mirror(lS), [5, 0]), ph: 'normal' }];
  if (attach === 'knee') return [{ pt: k, ph: 'normal' }, { pt: mirror(k), ph: 'normal' }];
  if (attach === 'hip') return [{ pt: add(p, [-5, 0]), ph: 'normal' }, { pt: add(p, [5, 0]), ph: 'normal' }];
  return [{ pt: w, ph: 'normal' }, { pt: mirror(w), ph: second }];
}

// ---------- тренажёры ----------
const TX_L = 7;
const TX_R = 93;
const BLOCK_TOP = 64; // верх подвижной части грузоблока в покое

interface Cable {
  grip: number | 'center' | 'pivot'; // от какой рукояти идёт трос
  anchor: Pt; // ролик, через который трос выходит к спортсмену
  tx: number; // стойка с грузоблоком
  pivot?: Pt;
}
interface Plan {
  cables: Cable[];
  levers: { pivot: Pt; grip: number }[];
  plates: boolean;
  sled?: { from: Pt; to: Pt; dir: Pt };
  towers: { tx: number; ph: Phase }[];
  lift: number;
}

const towerFor = (x: number) => (x >= 50 ? TX_R : TX_L);

function planRig(pat: Pattern, mods: Set<string>, equipment: Equipment, gA: Grip[], gB: Grip[]): Plan {
  const plan: Plan = { cables: [], levers: [], plates: mods.has('plates'), towers: [], lift: 0 };
  const travel = gA[0] && gB[0] ? len(sub(gB[0].pt, gA[0].pt)) : 0;
  plan.lift = clamp(travel * 0.3, 2.5, 8);
  const attach = attachOf(pat, mods);
  const front = pat.view === 'front';
  const shared = front && !mods.has('one') && (pat.bar || mods.has('rope') || mods.has('vbar')) && gA.length === 2;

  const addTower = (tx: number, ph: Phase) => {
    if (!plan.towers.some((t) => t.tx === tx)) plan.towers.push({ tx, ph });
  };

  if (equipment === 'machine' && pat.pivot) {
    // Рычажный тренажёр: рычаг вращается вокруг оси, на конце — рукоять или валик
    const pivots = front ? [pat.pivot, mirror(pat.pivot)] : [pat.pivot];
    pivots.forEach((pv, i) => {
      if (gA[i]) plan.levers.push({ pivot: pv, grip: i });
    });
    if (!plan.plates) {
      // Блочный: от кулачка на оси трос идёт к грузоблоку
      const pv = front ? mirror(pat.pivot) : pat.pivot;
      const tx = front ? TX_R : towerFor(pv[0] < 50 && pv[0] > 30 ? 60 : pv[0]);
      plan.cables.push({ grip: 'pivot', anchor: pv, tx, pivot: pv });
      addTower(tx, 'normal');
    }
    return plan;
  }

  if (equipment === 'machine' && attach === 'platform' && gA[0] && gB[0]) {
    // Салазки жима ногами ходят по направляющим
    const dir = unit(sub(gB[0].pt, gA[0].pt));
    plan.sled = { dir, from: add(gA[0].pt, mul(dir, -6)), to: add(gB[0].pt, mul(dir, 22)) };
    return plan;
  }

  const useCable = equipment === 'cable' || (equipment === 'machine' && !!pat.anchor);
  if (!useCable) return plan;
  const base: Pt = pat.anchor ?? [92, 10];
  const clampA = (a: Pt): Pt => [a[0], clamp(a[1], 4, 90)];
  if (shared) {
    const anchor = clampA(base);
    plan.cables.push({ grip: 'center', anchor, tx: towerFor(anchor[0]) });
    addTower(towerFor(anchor[0]), 'normal');
  } else if (front) {
    gA.forEach((g, i) => {
      if (g.ph === 'static' && attach === 'hands') return;
      const anchor = clampA(i === 1 ? mirror(base) : base);
      const tx = towerFor(anchor[0]);
      plan.cables.push({ grip: i, anchor, tx });
      addTower(tx, g.ph);
    });
  } else {
    const anchor = clampA(base);
    plan.cables.push({ grip: 0, anchor, tx: towerFor(anchor[0]) });
    addTower(towerFor(anchor[0]), 'normal');
  }
  return plan;
}

/** Путь троса: рукоять → ролик → вдоль стойки → верх грузоблока */
function cableRoute(start: Pt, anchor: Pt, tx: number, blockY: number): Pt[] {
  const o = tx > 50 ? 1 : -1;
  const out: Pt[] = [start, anchor];
  if (anchor[1] < 58) {
    out.push([tx, anchor[1]], [tx, blockY]);
  } else {
    // Нижний ролик: трос поднимается по внутренней стороне стойки и через верхний ролик опускается к грузу
    const xi = tx - o * 7.5;
    out.push([xi, anchor[1]], [xi, 4], [tx, 4], [tx, blockY]);
  }
  return out;
}

/** Неподвижные части тренажёров: рамы стоек, нижние плиты грузоблока, ролики, оси, направляющие */
function rigStatic(plan: Plan): { frame: string; shapes: Shape[] } {
  let frame = '';
  const shapes: Shape[] = [];
  for (const { tx } of plan.towers) {
    frame += ` M${tx - 6} 3 V91 M${tx + 6} 3 V91 M${tx - 6} 3 H${tx + 6}`;
    for (let i = 0; i < 4; i++) shapes.push({ tag: 'rect', cls: 'stack', x: tx - 4.5, y: 73 + i * 4.4, w: 9, h: 3.4 });
  }
  for (const c of plan.cables) {
    if (c.grip !== 'pivot') shapes.push({ tag: 'circle', cls: 'pulley', cx: c.anchor[0], cy: c.anchor[1], r: 2 });
    if (c.anchor[1] >= 58) shapes.push({ tag: 'circle', cls: 'pulley', cx: c.tx, cy: 4, r: 2 });
  }
  if (plan.sled) {
    const { from, to } = plan.sled;
    frame += ` M${f1(from[0])} ${f1(from[1])} L${f1(to[0])} ${f1(to[1])}`;
  }
  return { frame: frame.trim(), shapes };
}

/** Подвижные части тренажёров для одной позы (A или B) */
function rigDynamic(plan: Plan, grips: Grip[], isB: boolean, mods: Set<string>): { back: Shape[]; front: Shape[] } {
  const back: Shape[] = [];
  const front: Shape[] = [];
  const gripPh = (i: number): Phase => grips[i]?.ph ?? 'normal';
  // Грузоблок: подвижная пачка плит поднимается на величину хода
  for (const { tx, ph } of plan.towers) {
    const y = BLOCK_TOP - (isB ? plan.lift : 0);
    back.push({ tag: 'rect', cls: 'stack-move', ph, x: tx - 4.5, y, w: 9, h: 7.5 });
  }
  for (const c of plan.cables) {
    let start: Pt;
    let ph: Phase = 'normal';
    if (c.grip === 'pivot') start = c.pivot!;
    else if (c.grip === 'center') {
      const mid = lerp(grips[0].pt, grips[1].pt, 0.5);
      start = mods.has('rope') || mods.has('vbar') ? add(mid, mul(unit(sub(c.anchor, mid)), 6)) : mid;
    } else {
      start = grips[c.grip].pt;
      ph = gripPh(c.grip);
    }
    const blockY = BLOCK_TOP - (isB ? plan.lift : 0);
    back.push({ tag: 'polyline', cls: 'cable', ph, points: pts(cableRoute(start, c.anchor, c.tx, blockY)) });
    if (c.grip === 'center') {
      const [l, r] = [grips[0].pt, grips[1].pt];
      if (mods.has('rope')) {
        front.push({ tag: 'polyline', cls: 'rope', points: pts([l, start, r]) });
        front.push({ tag: 'circle', cls: 'hub', cx: l[0], cy: l[1], r: 1.6 });
        front.push({ tag: 'circle', cls: 'hub', cx: r[0], cy: r[1], r: 1.6 });
      } else if (mods.has('vbar')) {
        front.push({ tag: 'polyline', cls: 'bar', points: pts([l, start, r]) });
      } else {
        front.push({ tag: 'line', cls: 'bar', x1: l[0] - 3, y1: l[1], x2: r[0] + 3, y2: r[1] });
      }
    } else if (c.grip !== 'pivot') {
      const g = grips[c.grip].pt;
      if (mods.has('rope')) {
        // Канат: два хвостика с узлами
        const d = unit(sub(g, c.anchor));
        const pp = rot(d);
        front.push({ tag: 'polyline', cls: 'rope', ph, points: pts([add(g, add(mul(d, 3.5), mul(pp, 2.2))), g, add(g, add(mul(d, 3.5), mul(pp, -2.2)))]) });
        front.push({ tag: 'circle', cls: 'hub', ph, cx: g[0], cy: g[1], r: 1.4 });
      } else if (mods.has('vbar')) {
        const d = unit(sub(g, c.anchor));
        const pp = rot(d);
        front.push({ tag: 'polyline', cls: 'bar', ph, points: pts([add(g, mul(pp, 3)), add(g, mul(d, 2.5)), add(g, mul(pp, -3))]) });
      } else {
        // D-рукоять
        front.push({ tag: 'circle', cls: 'handle', ph, cx: g[0], cy: g[1], r: 2.4 });
      }
    }
  }
  for (const lv of plan.levers) {
    const g = grips[lv.grip];
    if (!g) continue;
    back.push({ tag: 'line', cls: 'arm', ph: g.ph, x1: lv.pivot[0], y1: lv.pivot[1], x2: g.pt[0], y2: g.pt[1] });
    if (plan.plates) {
      // Блины висят на рычаге — видно, что грузим рычаг, а не грузоблок
      const c = lerp(lv.pivot, g.pt, 0.45);
      back.push({ tag: 'circle', cls: 'plate', ph: g.ph, cx: c[0], cy: c[1], r: 5.5 });
    }
  }
  if (plan.sled && grips[0]) {
    const c = add(grips[0].pt, mul(plan.sled.dir, 7));
    back.push({ tag: 'circle', cls: 'plate', cx: c[0], cy: c[1], r: 5.5 });
    back.push({ tag: 'circle', cls: 'hub', cx: c[0], cy: c[1], r: 1.4 });
  }
  return { back, front };
}

// ---------- мышцы ----------
/** Направление «вперёд» для корпуса в боковом виде (грудь), с учётом положения лицом вниз */
function frontNormal(pose: Pose, pat: Pattern): Pt {
  const v = unit(rot(sub(pose.n!, pose.p!)));
  return pat.prone ? mul(v, -1) : v;
}

function muscleShapes(pose: Pose, pat: Pattern, muscle: string | undefined): Shape[] {
  if (!muscle) return [];
  const { h, n, p, e, w, k, a } = pose as Required<Pose>;
  const out: Shape[] = [];
  const line = (list: Pt[]) => out.push({ tag: 'polyline', cls: 'muscle', points: pts(list) });
  const dotAt = (c: Pt, r: number) => out.push({ tag: 'circle', cls: 'muscle-dot', cx: c[0], cy: c[1], r });

  if (pat.view === 'front') {
    const lS = add(n, [-7, 1]);
    const rS = mirror(lS);
    const lH = add(p, [-4, 0]);
    switch (muscle) {
      case 'chest':
        line([add(lS, [1, 4]), add(rS, [-1, 4])]);
        break;
      case 'shoulders':
        dotAt(lS, 3.4);
        dotAt(rS, 3.4);
        break;
      case 'traps':
      case 'neck':
        line([add(lS, [0, -1.5]), add(n, [0, -2]), add(rS, [0, -1.5])]);
        break;
      case 'biceps':
      case 'triceps':
        line([lS, lerp(lS, e, 0.9)]);
        line([rS, lerp(rS, mirror(e), 0.9)]);
        break;
      case 'forearms':
        line([e, w]);
        line([mirror(e), mirror(w)]);
        break;
      case 'abdominals':
        line([lerp(n, p, 0.35), lerp(n, p, 0.95)]);
        break;
      case 'lats':
      case 'middle back':
        line([add(lS, [1, 3]), lerp(lH, n, 0.35)]);
        line([add(rS, [-1, 3]), lerp(mirror(lH), n, 0.35)]);
        break;
      case 'lower back':
        line([lerp(n, p, 0.55), p]);
        break;
      case 'glutes':
        dotAt(lH, 3.6);
        dotAt(mirror(lH), 3.6);
        break;
      case 'calves':
        line([lerp(k, a, 0.1), lerp(k, a, 0.75)]);
        line([lerp(mirror(k), mirror(a), 0.1), lerp(mirror(k), mirror(a), 0.75)]);
        break;
      default: // бёдра: квадрицепс, бицепс бедра, приводящие, отводящие
        line([lerp(lH, k, 0.1), lerp(lH, k, 0.9)]);
        line([lerp(mirror(lH), mirror(k), 0.1), lerp(mirror(lH), mirror(k), 0.9)]);
    }
    return out;
  }

  const fwd = frontNormal(pose, pat);
  const off = (list: Pt[], v: Pt, d: number) => list.map((pt) => add(pt, mul(v, d)));
  const limbSide = (root: Pt, joint: Pt, end: Pt, fallback: Pt): Pt => {
    // Сторона сгиба сустава (бицепс, бицепс бедра) — та, к которой «складывается» конечность
    const nrm = unit(rot(sub(joint, root)));
    const s = dot(nrm, sub(end, joint));
    if (Math.abs(s) < 1.2) return dot(nrm, fallback) >= 0 ? nrm : mul(nrm, -1);
    return s > 0 ? nrm : mul(nrm, -1);
  };
  switch (muscle) {
    case 'chest':
      line(off([lerp(n, p, 0.05), lerp(n, p, 0.36)], fwd, 2.2));
      break;
    case 'abdominals':
      line(off([lerp(n, p, 0.4), lerp(n, p, 0.92)], fwd, 2.2));
      break;
    case 'lats':
    case 'middle back':
      line(off([lerp(n, p, 0.08), lerp(n, p, 0.58)], fwd, -2.2));
      break;
    case 'lower back':
      line(off([lerp(n, p, 0.58), lerp(n, p, 0.98)], fwd, -2.2));
      break;
    case 'traps':
    case 'neck':
      line(off([lerp(n, h, 0.55), lerp(n, p, 0.15)], fwd, -1.8));
      break;
    case 'shoulders':
      dotAt(n, 3.6);
      break;
    case 'biceps':
    case 'triceps': {
      const side = limbSide(n, e, w, fwd);
      line(off([lerp(n, e, 0.12), lerp(n, e, 0.92)], side, muscle === 'biceps' ? 1.8 : -1.8));
      break;
    }
    case 'forearms':
      line([lerp(e, w, 0.08), lerp(e, w, 0.85)]);
      break;
    case 'glutes':
      dotAt(add(p, mul(fwd, -2.6)), 3.8);
      break;
    case 'calves': {
      const t = pose.t ?? toe(k, a, 'side');
      const away = unit(sub(lerp(k, a, 0.5), lerp(t, a, 0.5)));
      const nrm = unit(rot(sub(a, k)));
      const back = dot(nrm, away) >= 0 ? nrm : mul(nrm, -1);
      line(off([lerp(k, a, 0.1), lerp(k, a, 0.7)], back, 1.6));
      break;
    }
    case 'hamstrings':
    case 'quadriceps':
    case 'adductors':
    case 'abductors':
    default: {
      const side = limbSide(p, k, a, mul(fwd, -1)); // сторона сгиба колена = задняя поверхность бедра
      const sign = muscle === 'hamstrings' ? 1.8 : muscle === 'quadriceps' ? -1.8 : 0;
      line(off([lerp(p, k, 0.1), lerp(p, k, 0.9)], side, sign));
    }
  }
  return out;
}

// ---------- траектория ----------
const JOINTS: (keyof Pose)[] = ['w', 'a', 'n', 'h', 'p', 'k', 'e'];
const CENTERS: Partial<Record<keyof Pose, (keyof Pose)[]>> = {
  w: ['e', 'n'],
  a: ['k', 'p'],
  a2: ['k2', 'p'],
  h: ['p'],
  n: ['p'],
  k: ['p'],
  e: ['n'],
  p: ['a'],
};

function attachKey(attach: Attach): keyof Pose {
  return attach === 'neck' ? 'n' : attach === 'hip' ? 'p' : attach === 'knee' ? 'k' : attach === 'ankle2' ? 'a2' : attach === 'platform' || attach === 'pad' ? 'a' : 'w';
}

/** Пунктирная дуга (или отрезок) движения рабочей точки со стрелками на концах */
function motionPath(A: Pose, B: Pose, attach: Attach, mods: Set<string>): string | null {
  const disp = (key: keyof Pose) => (A[key] && B[key] ? len(sub(B[key]!, A[key]!)) : 0);
  let key = attachKey(mods.has('onback') ? 'neck' : attach);
  if (disp(key) < 5) {
    key = JOINTS.reduce((best, j) => (disp(j) > disp(best) ? j : best), JOINTS[0]);
    if (disp(key) < 5) return null;
  }
  const mA = A[key]!;
  const mB = B[key]!;
  const body = lerp(A.n ?? mA, A.p ?? mA, 0.5);
  for (const ck of CENTERS[key] ?? []) {
    const cA = A[ck];
    const cB = B[ck];
    if (!cA || !cB || len(sub(cA, cB)) > 1.6) continue;
    const rA = len(sub(mA, cA));
    const rB = len(sub(mB, cA));
    if (rA < 6 || Math.abs(rA - rB) / rA > 0.14) continue;
    // Дуга вокруг неподвижного сустава, чуть снаружи траектории
    const r = (rA + rB) / 2 + 4.5;
    const pA = add(cA, mul(unit(sub(mA, cA)), r));
    const pB = add(cA, mul(unit(sub(mB, cA)), r));
    const cross = (mA[0] - cA[0]) * (mB[1] - cA[1]) - (mA[1] - cA[1]) * (mB[0] - cA[0]);
    return `M${f1(pA[0])} ${f1(pA[1])} A${f1(r)} ${f1(r)} 0 0 ${cross > 0 ? 1 : 0} ${f1(pB[0])} ${f1(pB[1])}`;
  }
  // Прямая, сдвинутая в сторону от корпуса
  const d = unit(sub(mB, mA));
  let nrm = rot(d);
  if (dot(nrm, sub(lerp(mA, mB, 0.5), body)) < 0) nrm = mul(nrm, -1);
  const pA = add(mA, add(mul(nrm, 5), mul(d, 1)));
  const pB = add(mB, add(mul(nrm, 5), mul(d, -1)));
  return `M${f1(pA[0])} ${f1(pA[1])} L${f1(pB[0])} ${f1(pB[1])}`;
}

// ---------- фигура и снаряд ----------
function shapesFor(pose: Pose, pat: Pattern, equipment: Equipment, mods: Set<string>, plan: Plan, isB: boolean, muscle?: string) {
  const s: Shape[] = [];
  const { h, n, p, e, w, k, a } = pose as Required<Pose>;
  const poly = (cls: string, list: Pt[], ph?: Phase) => s.push({ tag: 'polyline', cls, points: pts(list), ph });
  const second = secondPhase(mods);
  const attach = attachOf(pat, mods);
  const grips = gripsOf(pose, pat, mods, equipment);

  if (pat.view === 'side') {
    const e2 = pose.e2 ?? e;
    const w2 = pose.w2 ?? w;
    const k2 = pose.k2 ?? k;
    const a2 = pose.a2 ?? a;
    const t = pose.t ?? toe(k, a, 'side');
    const t2 = pose.t2 ?? (pose.k2 ? toe(k2, a2, 'side') : t);
    poly('limb far', [p, k2, a2, t2], mods.has('one') && !pose.k2 ? 'static' : 'normal');
    poly('limb far', [n, e2, w2], pose.e2 ? 'normal' : second);
    poly('torso', [n, p]);
    poly('limb', [p, k, a, t]);
    poly('limb', [n, e, w]);
    s.push({ tag: 'circle', cls: 'head', cx: h[0], cy: h[1], r: 5.6 });
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
    s.push({ tag: 'circle', cls: 'head', cx: h[0], cy: h[1], r: 5.6 });
  }

  if (mods.has('assist')) {
    s.push({ tag: 'circle', cls: 'pad', cx: k[0], cy: k[1] + 2, r: 3.2 });
    if (pat.view === 'front') s.push({ tag: 'circle', cls: 'pad', cx: 100 - k[0], cy: k[1] + 2, r: 3.2 });
  }

  // Снаряд
  const prop: Shape[] = [];
  const barLike = equipment === 'barbell' || equipment === 'smith' || equipment === 'ezbar';
  const both = grips.length === 2 && grips[1].ph === 'normal';
  const neutral = mods.has('neutral');
  if (pat.view === 'front' && barLike && both) {
    const [l, r] = [grips[0].pt, grips[1].pt];
    if (equipment === 'ezbar') {
      // EZ-гриф: изгибы под кисти
      const y = l[1];
      prop.push({ tag: 'polyline', cls: 'bar-poly', points: pts([[l[0] - 13, y], [l[0] - 1, y], [l[0] + 2.5, y + 2], [(l[0] + r[0]) / 2, y - 1], [r[0] - 2.5, y + 2], [r[0] + 1, y], [r[0] + 13, r[1]]]) });
    } else {
      prop.push({ tag: 'line', cls: 'bar', x1: l[0] - 13, y1: l[1], x2: r[0] + 13, y2: r[1] });
    }
    prop.push({ tag: 'line', cls: 'plate-edge', x1: l[0] - 10, y1: l[1] - 7, x2: l[0] - 10, y2: l[1] + 7 });
    prop.push({ tag: 'line', cls: 'plate-edge', x1: r[0] + 10, y1: r[1] - 7, x2: r[0] + 10, y2: r[1] + 7 });
  } else {
    for (const { pt: g, ph } of grips) {
      if (ph === 'static' && attach === 'hands') continue; // вторая рука пустая
      const push = (sh: Shape) => prop.push({ ...sh, ph });
      switch (equipment) {
        case 'barbell':
        case 'smith':
        case 'ezbar':
          push({ tag: 'circle', cls: 'plate', cx: g[0], cy: g[1], r: 8 });
          push({ tag: 'circle', cls: 'hub', cx: g[0], cy: g[1], r: 1.6 });
          break;
        case 'dumbbell': {
          // Гантель видна целиком, если гриф поперёк взгляда; с торца — кружком
          const lengthwise = pat.view === 'front' ? !neutral : neutral;
          if (lengthwise) {
            push({ tag: 'line', cls: 'db-handle', x1: g[0] - 4.5, y1: g[1], x2: g[0] + 4.5, y2: g[1] });
            push({ tag: 'line', cls: 'db-head', x1: g[0] - 4.5, y1: g[1] - 3, x2: g[0] - 4.5, y2: g[1] + 3 });
            push({ tag: 'line', cls: 'db-head', x1: g[0] + 4.5, y1: g[1] - 3, x2: g[0] + 4.5, y2: g[1] + 3 });
          } else {
            push({ tag: 'circle', cls: 'dumbbell', cx: g[0], cy: g[1], r: 3.6 });
            push({ tag: 'circle', cls: 'hub-in', cx: g[0], cy: g[1], r: 1.2 });
          }
          break;
        }
        case 'kettlebell':
          push({ tag: 'circle', cls: 'kb-handle', cx: g[0], cy: g[1] + 1.8, r: 2.4 });
          push({ tag: 'circle', cls: 'dumbbell', cx: g[0], cy: g[1] + 6, r: 4.5 });
          break;
        case 'machine': {
          if (plan.cables.length && !plan.levers.length) break; // рукояти рисует блок
          if (attach === 'platform') {
            const kk = pose.k as Pt;
            const dir = unit(sub(g, kk));
            const pp = mul(rot(dir), 8);
            const c = add(g, mul(dir, 3));
            push({ tag: 'line', cls: 'platform', x1: c[0] - pp[0], y1: c[1] - pp[1], x2: c[0] + pp[0], y2: c[1] + pp[1] });
          } else if (attach === 'hands') {
            push({ tag: 'circle', cls: 'handle', cx: g[0], cy: g[1], r: 2.4 });
          } else {
            push({ tag: 'circle', cls: 'pad', cx: g[0], cy: g[1], r: 3.6 });
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
    prop.push({ tag: 'line', cls: 'bar', x1: g[0], y1: g[1], x2: 8, y2: 90 });
    prop.push({ tag: 'circle', cls: 'plate', cx: g[0] - 4, cy: g[1] + 3, r: 6 });
  }

  const rig = rigDynamic(plan, grips, isB, mods);
  const muscles = muscleShapes(pose, pat, muscle);
  // Подсветка мышц — поверх фигуры (полупрозрачная), снаряд — поверх всего (кроме «за головой»)
  return pat.behind ? [...rig.back, ...prop, ...rig.front, ...s, ...muscles] : [...rig.back, ...s, ...muscles, ...rig.front, ...prop];
}

/** Неподвижные элементы сцены, зависящие от модификаторов */
function extraScene(pat: Pattern, mods: Set<string>, poseA: Pose): string {
  let d = '';
  if (mods.has('seated') && poseA.p) {
    const [x, y] = poseA.p;
    d += pat.view === 'side' ? ` M${x - 12} ${y + 4} H${x + 12} M${x} ${y + 4} V91` : ` M${x - 16} ${y + 4} H${x + 16} M${x} ${y + 4} V91`;
  }
  if (mods.has('box')) d += ' M28 71 H46 V91 M28 71 V91';
  if (mods.has('support')) d += ' M40 61 L76 45 M54 55 L52 91';
  if (mods.has('deficit')) d += ' M30 88 H70 V91 M30 88 V91';
  return d.trim();
}

/** Направляющие Смита — всегда вертикальные, поэтому считаются по уже повёрнутой позе */
function railsScene(pat: Pattern, mods: Set<string>, pose: Pose): string {
  if (!mods.has('rails')) return '';
  if (pat.view === 'side') {
    const g = (mods.has('onback') || pat.attach === 'neck' ? pose.n : pose.w) as Pt;
    return `M${f1(g[0] + 10)} 2 V91`;
  }
  const w = (mods.has('onback') ? pose.n : pose.w) as Pt;
  const x = f1(Math.min(w[0], 100 - w[0]) - 18);
  return `M${x} 2 V91 M${100 - x} 2 V91`;
}

/** Делит сцену на мягкие элементы (сиденья, спинки, валики — толстые) и раму (тонкие стойки) */
export function splitScene(d: string): { pads: string; frame: string } {
  const pads: string[] = [];
  const frame: string[] = [];
  for (const sub0 of d.split(/(?=M)/)) {
    const tk = sub0.trim().match(/[MHVLZ]|-?\d+(?:\.\d+)?/g);
    if (!tk) continue;
    const closed = tk.includes('Z');
    let x = 0;
    let y = 0;
    let sx = 0;
    let sy = 0;
    let cmd = '';
    for (let i = 0; i < tk.length; ) {
      const t = tk[i];
      if (/[MHVLZ]/.test(t)) {
        cmd = t;
        i++;
        if (cmd === 'Z') {
          frame.push(`M${x} ${y} L${sx} ${sy}`);
          x = sx;
          y = sy;
        }
        continue;
      }
      let nx = x;
      let ny = y;
      if (cmd === 'M') {
        x = Number(tk[i]);
        y = Number(tk[i + 1]);
        sx = x;
        sy = y;
        i += 2;
        continue;
      } else if (cmd === 'H') {
        nx = Number(tk[i]);
        i += 1;
      } else if (cmd === 'V') {
        ny = Number(tk[i]);
        i += 1;
      } else if (cmd === 'L') {
        nx = Number(tk[i]);
        ny = Number(tk[i + 1]);
        i += 2;
      } else {
        i++;
        continue;
      }
      const seg = `M${x} ${y} L${nx} ${ny}`;
      const vertical = Math.abs(nx - x) < 0.5;
      const toFloor = Math.max(y, ny) >= 88;
      const overhead = Math.max(y, ny) < 12;
      const isPad = !closed && !vertical && !toFloor && !overhead;
      (isPad ? pads : frame).push(seg);
      x = nx;
      y = ny;
    }
  }
  return { pads: pads.join(' '), frame: frame.join(' ') };
}

function timing(pat: Pattern, mods: Set<string>) {
  const dur = mods.has('slow') ? 4 : mods.has('fast') ? 1.9 : pat.dur ?? 3;
  // Движение → короткая пауза в крайней точке → обратно → пауза в исходной
  const keyTimes = mods.has('pause') ? '0;0.34;0.6;0.94;1' : '0;0.42;0.5;0.92;1';
  const ease = '0.45 0 0.55 1';
  const hold = '0 0 1 1';
  return { dur, keyTimes, keySplines: [ease, hold, ease, hold].join(';') };
}

type Timing = ReturnType<typeof timing>;

function Anim({ attr, a, b, tm, ph }: { attr: string; a: string | number; b: string | number; tm: Timing; ph?: Phase }) {
  if (a === b || ph === 'static') return null;
  return (
    <animate
      attributeName={attr}
      values={`${a};${b};${b};${a};${a}`}
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
  if (A.tag === 'rect' && B.tag === 'rect') {
    return (
      <rect key={key} className={A.cls} x={A.x} y={A.y} width={A.w} height={A.h} rx={1}>
        <Anim attr="y" a={f1(A.y)} b={f1(B.y)} tm={tm} ph={ph} />
      </rect>
    );
  }
  return null;
}

export const ExerciseAnim = memo(function ExerciseAnim({
  anim,
  equipment,
  muscle,
  size = 96,
  still = false,
  guides = true,
}: {
  anim: string;
  equipment: Equipment;
  /** Основная мышца (как в каталоге: chest, lats, quadriceps…) — подсвечивается */
  muscle?: string;
  size?: number;
  still?: boolean;
  /** Траектория движения пунктиром */
  guides?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const spec = parseAnim(anim, equipment);
  if (!spec) return <div className="anim-missing" style={{ width: size, height: size }} />;
  const { pat, mods } = spec;
  const baseA = transformPose(pat.A, pat, mods);
  // Наклон скамьи: поворачиваем фигуру вместе со скамьёй (incline — вокруг таза, decline — вокруг головы).
  // Точки позы поворачиваем сами, а не трансформом, чтобы стойки блоков и тросы оставались вертикальными.
  const tilt = mods.has('incline') ? { deg: 22, at: baseA.p } : mods.has('decline') ? { deg: -14, at: baseA.h } : null;
  const turn = (pose: Pose): Pose => (tilt?.at ? rotatePose(pose, tilt.deg, tilt.at) : pose);
  const poseA = turn(baseA);
  const poseB = turn(transformPose(pat.B, pat, mods));
  const gA = gripsOf(poseA, pat, mods, equipment);
  const gB = gripsOf(poseB, pat, mods, equipment);
  const plan = planRig(pat, mods, equipment, gA, gB);
  const A = shapesFor(poseA, pat, equipment, mods, plan, false, muscle);
  const B = shapesFor(poseB, pat, equipment, mods, plan, true, muscle);
  const tm = timing(pat, mods);
  const { pads, frame } = splitScene([pat.scene, extraScene(pat, mods, baseA)].filter(Boolean).join(' '));
  const rig = rigStatic(plan);
  const rails = railsScene(pat, mods, poseA);
  const path = guides && !still ? motionPath(poseA, poseB, attachOf(pat, mods), mods) : null;

  const marker = `arr${uid}`;
  const scene = (
    <>
      {frame && <path className="scene" d={frame} />}
      {pads && <path className="pads" d={pads} />}
    </>
  );
  return (
    <svg className="exercise-anim" viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <defs>
        <marker id={marker} viewBox="0 0 6 6" refX="3" refY="3" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse">
          <path d="M0 0.4 L5.6 3 L0 5.6 Z" className="motion-head" />
        </marker>
      </defs>
      <line className="floor" x1="2" y1="92" x2="98" y2="92" />
      {rig.frame && <path className="scene" d={rig.frame} />}
      {rails && <path className="scene" d={rails} />}
      {rig.shapes.map((sh, i) => renderPair(sh, sh, 10000 + i, tm))}
      {tilt?.at ? <g transform={`rotate(${tilt.deg} ${tilt.at[0]} ${tilt.at[1]})`}>{scene}</g> : scene}
      {path && <path className="motion" d={path} markerStart={`url(#${marker})`} markerEnd={`url(#${marker})`} />}
      {A.map((sa, i) => (still ? renderPair(sa, sa, i, tm) : renderPair(sa, B[i], i, tm)))}
    </svg>
  );
});
