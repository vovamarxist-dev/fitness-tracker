import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useApp } from '../lib/app';
import { inTelegram, haptic } from '../lib/telegram';
import { ExerciseAnim } from '../anim/ExerciseAnim';
import type { Equipment } from '../logic/types';

export function Header({ title, right }: { title: string; right?: ReactNode }) {
  const { canBack, back, t } = useApp();
  return (
    <header className="header">
      {/* В Telegram «Назад» — системная кнопка в шапке, в браузере рисуем свою */}
      {canBack && !inTelegram ? (
        <button className="header-back" onClick={back} aria-label={t('back')}>
          ‹
        </button>
      ) : (
        <span className="header-spacer" />
      )}
      <h1 className="header-title">{title}</h1>
      <span className="header-right">{right}</span>
    </header>
  );
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  label,
  format,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  label?: string;
  format?: (v: number) => string;
}) {
  const set = (v: number) => {
    const c = Math.min(max, Math.max(min, Math.round(v * 100) / 100));
    if (c !== value) {
      haptic.tap();
      onChange(c);
    }
  };
  return (
    <div className="stepper">
      {label && <span className="stepper-label">{label}</span>}
      <div className="stepper-row">
        <button type="button" onClick={() => set(value - step)} disabled={value <= min} aria-label="−">
          −
        </button>
        <span className="stepper-value">{format ? format(value) : value}</span>
        <button type="button" onClick={() => set(value + step)} disabled={value >= max} aria-label="+">
          +
        </button>
      </div>
    </div>
  );
}

/** Числовое поле веса: можно ввести вручную или нажимать ± на шаг */
export function WeightInput({ value, step, onChange, label }: { value: number; step: number; onChange: (v: number) => void; label: string }) {
  const [text, setText] = useState(String(value).replace('.', ','));
  useEffect(() => setText(String(value).replace('.', ',')), [value]);
  const commit = (s: string) => {
    const v = Number(s.replace(',', '.'));
    if (Number.isFinite(v) && v >= 0) onChange(Math.round(v * 100) / 100);
    else setText(String(value).replace('.', ','));
  };
  const inc = step > 0 ? step : 2.5;
  return (
    <div className="stepper">
      <span className="stepper-label">{label}</span>
      <div className="stepper-row">
        <button type="button" onClick={() => onChange(Math.max(0, Math.round((value - inc) * 100) / 100))} disabled={value <= 0}>
          −
        </button>
        <input
          className="stepper-value stepper-input"
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        <button type="button" onClick={() => onChange(Math.round((value + inc) * 100) / 100)}>
          +
        </button>
      </div>
    </div>
  );
}

export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="sheet-grip" />
        {children}
      </div>
    </div>
  );
}

export function Chips<T extends string>({ items, value, onChange }: { items: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="chips" role="tablist">
      {items.map((it) => (
        <button key={it.id} role="tab" aria-selected={it.id === value} className={`chip ${it.id === value ? 'on' : ''}`} onClick={() => onChange(it.id)}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

/** Анимация, которая запускается только когда карточка видна на экране */
export function LazyAnim({ anim, equipment, size }: { anim: string; equipment: Equipment; size: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([en]) => setVisible(en.isIntersecting), { rootMargin: '120px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="lazy-anim" style={{ width: size, height: size }}>
      {visible ? <ExerciseAnim anim={anim} equipment={equipment} size={size} /> : <ExerciseAnim anim={anim} equipment={equipment} size={size} still />}
    </div>
  );
}

export function fmtRest(sec: number, t: ReturnType<typeof useApp>['t']) {
  if (sec < 60) return `${sec} ${t('sec')}`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}:${String(s).padStart(2, '0')} ${t('min')}` : `${m} ${t('min')}`;
}
