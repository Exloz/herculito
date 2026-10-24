import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from './ThemeProvider';
import { ThemePicker } from './ThemePicker';
import { DEFAULT_THEME, isThemeId, readTheme, THEMES, THEME_STORAGE_KEY } from './themes';

beforeEach(() => {
  const values = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  };
  vi.stubGlobal('localStorage', storage);
  Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
  document.documentElement.removeAttribute('data-theme');
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('theme selection', () => {
  it('validates against the registry and defaults to the existing dark theme', () => {
    expect(isThemeId('unknown')).toBe(false);
    THEMES.forEach((theme) => expect(isThemeId(theme.id)).toBe(true));
    window.localStorage.setItem(THEME_STORAGE_KEY, 'unknown');
    expect(readTheme()).toBe(DEFAULT_THEME);
  });

  it('restores a saved preference and persists changes', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    render(<ThemeProvider><ThemePicker /></ThemeProvider>);
    expect(document.documentElement.dataset.theme).toBe('light');
    fireEvent.click(screen.getByRole('button', { name: 'Elegir tema: Claro' }));
    expect(screen.getAllByRole('radio')).toHaveLength(THEMES.length);
    expect(screen.getByRole('radio', { name: 'Claro' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'Oscuro' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('works without browser storage', () => {
    vi.mocked(window.localStorage.getItem).mockImplementation(() => { throw new Error('blocked'); });
    vi.mocked(window.localStorage.setItem).mockImplementation(() => { throw new Error('blocked'); });
    render(<ThemeProvider><ThemePicker /></ThemeProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Elegir tema: Oscuro' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Claro' }));
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('synchronizes changes and resets from another tab', () => {
    render(<ThemeProvider><ThemePicker /></ThemeProvider>);
    fireEvent(window, new StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: 'forest' }));
    expect(document.documentElement.dataset.theme).toBe('forest');
    fireEvent(window, new StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: null }));
    expect(document.documentElement.dataset.theme).toBe(DEFAULT_THEME);
  });

  it.each(THEMES)('restores $label with its correct native color scheme and browser color', (theme) => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.append(meta);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme.id);
    render(<ThemeProvider><ThemePicker /></ThemeProvider>);
    expect(document.documentElement.dataset.theme).toBe(theme.id);
    expect(document.documentElement.style.colorScheme).toBe(theme.colorScheme);
    expect(meta.content).toBe(theme.browserColor);
    meta.remove();
  });

  it('keeps a chosen theme when closing and restores focus to its trigger', () => {
    render(<ThemeProvider><ThemePicker /></ThemeProvider>);
    const trigger = screen.getByRole('button', { name: 'Elegir tema: Oscuro' });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('radio', { name: 'Bosque' }));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('forest');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Elige tu tema' })).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(document.body.classList.contains('dialog-open')).toBe(false);
    expect(trigger).toHaveAccessibleName('Elegir tema: Bosque');
  });
});
