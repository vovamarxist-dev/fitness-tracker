import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { liveQuery } from 'dexie';
import { db, DEFAULT_SETTINGS, loadSettings, saveSettings } from './db';
import { makeT } from './i18n';
import { tg } from './telegram';
import { setCustomExercises } from '../data/catalog';
import type { Settings } from '../logic/types';

export type Route =
  | { name: 'home' }
  | { name: 'pick' }
  | { name: 'workout'; id: string }
  | { name: 'summary'; id: string }
  | { name: 'plans' }
  | { name: 'session'; id: string }
  | { name: 'catalog'; sessionId?: string }
  | { name: 'settings' }
  | { name: 'policy' }
  | { name: 'consent' };

interface AppCtx {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  t: ReturnType<typeof makeT>;
  route: Route;
  push: (r: Route) => void;
  back: () => void;
  replace: (r: Route) => void;
  reset: (r?: Route) => void;
  canBack: boolean;
}

const Ctx = createContext<AppCtx | null>(null);

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp outside provider');
  return c;
}

/** Живой запрос к IndexedDB: компонент перерисовывается при изменении данных */
export function useLive<T>(fn: () => Promise<T> | T, deps: unknown[]): T | undefined {
  const [val, setVal] = useState<T>();
  useEffect(() => {
    const sub = liveQuery(fn).subscribe({ next: setVal, error: (e) => console.error(e) });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return val;
}

function resolveTheme(s: Settings): 'light' | 'dark' {
  if (s.theme !== 'system') return s.theme;
  if (tg) return tg.colorScheme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);
  const [, force] = useState(0);

  useEffect(() => {
    void loadSettings().then((s) => {
      setSettings(s);
      setReady(true);
    });
    const sub = liveQuery(() => db.custom.toArray()).subscribe((list) => {
      setCustomExercises(list);
      force((x) => x + 1);
    });
    return () => sub.unsubscribe();
  }, []);

  // Тема
  useEffect(() => {
    const apply = () => {
      const theme = resolveTheme(settings);
      document.documentElement.dataset.theme = theme;
      const bg = theme === 'dark' ? '#0f1115' : '#f4f5f2';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
      if (tg?.isVersionAtLeast('6.1')) {
        tg.setHeaderColor?.(bg);
        tg.setBackgroundColor?.(bg);
      }
    };
    apply();
    document.documentElement.lang = settings.lang;
    tg?.onEvent('themeChanged', apply);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      void saveSettings(next);
      return next;
    });
  }, []);

  const push = useCallback((r: Route) => setStack((s) => [...s, r]), []);
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
  const replace = useCallback((r: Route) => setStack((s) => [...s.slice(0, -1), r]), []);
  const reset = useCallback((r?: Route) => setStack(r && r.name !== 'home' ? [{ name: 'home' }, r] : [{ name: 'home' }]), []);

  const route = stack[stack.length - 1];
  const canBack = stack.length > 1 && route.name !== 'workout';

  // Системная кнопка «Назад» в Telegram
  const backRef = useRef(back);
  backRef.current = back;
  useEffect(() => {
    if (!tg?.isVersionAtLeast('6.1')) return;
    const handler = () => backRef.current();
    if (canBack) {
      tg.BackButton.show();
      tg.BackButton.onClick(handler);
    } else tg.BackButton.hide();
    return () => tg?.BackButton.offClick(handler);
  }, [canBack]);

  // Смена экрана — прокрутка наверх
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  const t = useMemo(() => makeT(settings.lang), [settings.lang]);
  const value = useMemo(
    () => ({ settings, updateSettings, t, route, push, back, replace, reset, canBack }),
    [settings, updateSettings, t, route, push, back, replace, reset, canBack],
  );
  if (!ready) return null;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
