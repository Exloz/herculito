export const THEMES = [
  { id: 'dark', label: 'Oscuro', colorScheme: 'dark', browserColor: '#0b0f14' },
  { id: 'light', label: 'Claro', colorScheme: 'light', browserColor: '#f4f7f6' }
] as const;

export type ThemeId = typeof THEMES[number]['id'];
export const THEME_STORAGE_KEY = 'herculito-theme';
export const DEFAULT_THEME: ThemeId = 'dark';

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

export function readTheme(): ThemeId {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(themeId: ThemeId): void {
  const theme = THEMES.find((entry) => entry.id === themeId);
  if (!theme || typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme.id;
  document.documentElement.style.colorScheme = theme.colorScheme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.browserColor);
}
