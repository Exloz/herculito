import { useRef, useState } from 'react';
import { ChevronDown, Palette } from 'lucide-react';
import { useTheme } from './theme-context';
import { THEMES } from './themes';
import { ThemeGallery } from './ThemeGallery';
import './theme-picker.css';

export function ThemePicker({ showLabel = false }: { showLabel?: boolean }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const current = THEMES.find((option) => option.id === theme)!;
  return (
    <>
      <button ref={triggerRef} type="button" className="theme-picker-trigger" onClick={() => setOpen(true)}
        aria-label={`Elegir tema: ${current.label}`} aria-haspopup="dialog" aria-expanded={open}
        title={`Apariencia: ${current.label}`}>
        <Palette size={18} aria-hidden="true" />
        {showLabel && <span>{current.label}</span>}
        <ChevronDown size={12} aria-hidden="true" />
      </button>
      {open && <ThemeGallery onClose={() => setOpen(false)}
        parentDialog={triggerRef.current?.closest('[role="dialog"]') ?? null} />}
    </>
  );
}
