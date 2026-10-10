import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ThemeContext } from './theme-context';
import { applyTheme, DEFAULT_THEME, isThemeId, readTheme, THEME_STORAGE_KEY } from './themes';
import type { ThemeId } from './themes';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(readTheme);

  const setTheme = useCallback((next: ThemeId) => {
    if (!isThemeId(next)) return;
    applyTheme(next);
    setThemeState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Theme switching still works when browser storage is unavailable.
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const syncTheme = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
      const next = isThemeId(event.newValue) ? event.newValue : DEFAULT_THEME;
      setThemeState(next);
      applyTheme(next);
    };
    window.addEventListener('storage', syncTheme);
    return () => window.removeEventListener('storage', syncTheme);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
