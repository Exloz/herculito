import { ChevronDown, Moon, Palette, Sun } from 'lucide-react';
import { useTheme } from './theme-context';
import { isThemeId, THEMES } from './themes';

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Palette;
  const currentLabel = THEMES.find((option) => option.id === theme)?.label;
  return (
    <label className="relative flex h-11 w-14 shrink-0 items-center justify-center gap-1 rounded-xl bg-white/[0.03] text-muted ring-1 ring-inset ring-mist/40 hover:text-content focus-within:ring-2 focus-within:ring-accent/60">
      <span className="sr-only">Apariencia</span>
      <ThemeIcon size={18} aria-hidden="true" />
      <ChevronDown size={12} aria-hidden="true" />
      <select value={theme} title={`Apariencia: ${currentLabel}`}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        onChange={(event) => {
          if (isThemeId(event.target.value)) setTheme(event.target.value);
        }}>
        {THEMES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
  );
}
