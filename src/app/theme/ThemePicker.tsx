import { useTheme } from './theme-context';
import { THEMES } from './themes';

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  return (
    <fieldset className="app-card mb-5 p-4">
      <legend className="sr-only">Apariencia</legend>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-content">Apariencia</span>
        <div className="flex flex-wrap gap-1 rounded-xl bg-raised p-1">
          {THEMES.map((option) => (
            <button key={option.id} type="button" onClick={() => setTheme(option.id)}
              aria-pressed={theme === option.id}
              className={`touch-target rounded-lg px-4 text-sm font-semibold ${theme === option.id ? 'bg-accent text-onAccent' : 'text-muted hover:text-content'}`}>
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </fieldset>
  );
}
