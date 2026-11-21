// Тонкая обёртка над Telegram Web App API. Вне Telegram (обычный браузер) всё работает
// без него: вибрация через navigator.vibrate, кнопка «назад» — своя в шапке.

interface TgHaptic {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
  notificationOccurred(type: 'error' | 'success' | 'warning'): void;
  selectionChanged(): void;
}
interface TgBackButton {
  show(): void;
  hide(): void;
  onClick(cb: () => void): void;
  offClick(cb: () => void): void;
}
interface TgWebApp {
  initData: string;
  initDataUnsafe: { user?: { id: number; first_name?: string; language_code?: string } };
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  version: string;
  platform: string;
  ready(): void;
  expand(): void;
  isVersionAtLeast(v: string): boolean;
  enableClosingConfirmation(): void;
  disableClosingConfirmation(): void;
  disableVerticalSwipes?(): void;
  setHeaderColor?(c: string): void;
  setBackgroundColor?(c: string): void;
  onEvent(e: string, cb: () => void): void;
  BackButton: TgBackButton;
  HapticFeedback: TgHaptic;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

export const tg: TgWebApp | undefined = window.Telegram?.WebApp?.initData ? window.Telegram.WebApp : undefined;
export const inTelegram = !!tg;

export function initTelegram() {
  if (!tg) return;
  tg.ready();
  tg.expand();
  if (tg.isVersionAtLeast('7.7')) tg.disableVerticalSwipes?.();
}

export const haptic = {
  tap() {
    if (tg?.isVersionAtLeast('6.1')) tg.HapticFeedback.impactOccurred('light');
  },
  warn() {
    if (tg?.isVersionAtLeast('6.1')) tg.HapticFeedback.notificationOccurred('warning');
    else navigator.vibrate?.([120, 80, 120]);
  },
  done() {
    if (tg?.isVersionAtLeast('6.1')) {
      tg.HapticFeedback.notificationOccurred('success');
      setTimeout(() => tg.HapticFeedback.impactOccurred('heavy'), 250);
      setTimeout(() => tg.HapticFeedback.impactOccurred('heavy'), 500);
    } else navigator.vibrate?.([300, 120, 300, 120, 300]);
  },
};

export function setClosingConfirmation(on: boolean) {
  if (!tg?.isVersionAtLeast('6.2')) return;
  if (on) tg.enableClosingConfirmation();
  else tg.disableClosingConfirmation();
}

/** Список Telegram ID, которым открыт тестовый доступ (через запятую в VITE_ALLOWED_IDS) */
const ALLOWED = String(import.meta.env.VITE_ALLOWED_IDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function accessAllowed(): boolean {
  if (ALLOWED.length === 0) return true; // список не задан — доступ открыт
  if (!tg) return import.meta.env.DEV; // вне Telegram — только при локальной разработке
  const id = tg.initDataUnsafe.user?.id;
  return id != null && ALLOWED.includes(String(id));
}

export const telegramUserId = () => tg?.initDataUnsafe.user?.id;
