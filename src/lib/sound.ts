// Короткие сигналы таймера через Web Audio — без звуковых файлов.
let ctx: AudioContext | null = null;

/** Вызывать по нажатию пользователя: браузеры разрешают звук только после жеста */
export function unlockAudio() {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

function tone(freq: number, start: number, dur: number) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + start);
  o.stop(ctx.currentTime + start + dur + 0.05);
}

export const beep = {
  warn() {
    tone(660, 0, 0.15);
  },
  end() {
    tone(880, 0, 0.18);
    tone(880, 0.25, 0.18);
    tone(1175, 0.5, 0.35);
  },
};
