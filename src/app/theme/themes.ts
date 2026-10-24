export const THEMES = [
  { id: 'dark', label: 'Oscuro', description: 'Grafito, arcilla y lavanda', colorScheme: 'dark', browserColor: '#16151b', surfaceColor: '#26242c', accentColor: '#e9b394' },
  { id: 'midnight', label: 'Medianoche', description: 'Azul profundo y hielo', colorScheme: 'dark', browserColor: '#101827', surfaceColor: '#202e44', accentColor: '#92c5f8' },
  { id: 'forest', label: 'Bosque', description: 'Pino y verde suave', colorScheme: 'dark', browserColor: '#121c18', surfaceColor: '#24372d', accentColor: '#a4d4ad' },
  { id: 'amethyst', label: 'Amatista', description: 'Ciruela y violeta', colorScheme: 'dark', browserColor: '#1c1525', surfaceColor: '#34263f', accentColor: '#d2b5ef' },
  { id: 'cocoa', label: 'Cacao', description: 'Café y caramelo', colorScheme: 'dark', browserColor: '#201914', surfaceColor: '#3a2d25', accentColor: '#e6bb87' },
  { id: 'carbon', label: 'Carbón', description: 'Negro y plata', colorScheme: 'dark', browserColor: '#0c0d10', surfaceColor: '#222428', accentColor: '#e0e3e8' },
  { id: 'aurora', label: 'Aurora', description: 'Petróleo y turquesa', colorScheme: 'dark', browserColor: '#101e22', surfaceColor: '#21373e', accentColor: '#87d8cc' },
  { id: 'light', label: 'Claro', description: 'Papel cálido y arcilla', colorScheme: 'light', browserColor: '#f3f0e9', surfaceColor: '#fffcf7', accentColor: '#9b4d32' },
  { id: 'ocean', label: 'Océano', description: 'Bruma y azul marino', colorScheme: 'light', browserColor: '#edf3f8', surfaceColor: '#fafcff', accentColor: '#285f96' },
  { id: 'sage', label: 'Salvia', description: 'Lino y eucalipto', colorScheme: 'light', browserColor: '#eff3ec', surfaceColor: '#fbfdf8', accentColor: '#386448' },
  { id: 'lavender', label: 'Lavanda', description: 'Lila suave y violeta', colorScheme: 'light', browserColor: '#f2eff8', surfaceColor: '#fdfbff', accentColor: '#70529e' },
  { id: 'sand', label: 'Arena', description: 'Crema y terracota', colorScheme: 'light', browserColor: '#f5eee2', surfaceColor: '#fffaf0', accentColor: '#8f4e25' },
  { id: 'rose', label: 'Rosa', description: 'Porcelana y cereza', colorScheme: 'light', browserColor: '#f8eff1', surfaceColor: '#fffafc', accentColor: '#a04667' },
  { id: 'snow', label: 'Nieve', description: 'Blanco y azul tinta', colorScheme: 'light', browserColor: '#f5f7fa', surfaceColor: '#ffffff', accentColor: '#3857a0' }
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
