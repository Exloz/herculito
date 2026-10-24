import { useEffect, useId, useRef } from 'react';
import { Check, Moon, Sun, X } from 'lucide-react';
import { DialogPortal } from '../../shared/ui/DialogPortal';
import { useDialogA11y } from '../../shared/hooks/useDialogA11y';
import { useTheme } from './theme-context';
import { THEMES } from './themes';

export function ThemeGallery({ onClose, parentDialog }: { onClose: () => void; parentDialog: Element | null }) {
  const { theme, setTheme } = useTheme();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const groupName = useId();
  const current = THEMES.find((option) => option.id === theme)!;
  useDialogA11y(dialogRef, { onClose });

  useEffect(() => {
    const previousModal = parentDialog?.getAttribute('aria-modal');
    parentDialog?.setAttribute('aria-modal', 'false');
    dialogRef.current?.querySelector<HTMLInputElement>('input:checked')?.scrollIntoView?.({ block: 'nearest' });
    return () => {
      if (previousModal === null) parentDialog?.removeAttribute('aria-modal');
      else if (previousModal !== undefined) parentDialog?.setAttribute('aria-modal', previousModal);
    };
  }, [parentDialog]);

  return <DialogPortal>
    <div className="theme-gallery-backdrop" onClick={(event) => { event.stopPropagation(); onClose(); }}>
      <div ref={dialogRef} className="theme-gallery" role="dialog" aria-modal="true"
        aria-labelledby={titleId} aria-describedby={descriptionId} onClick={(event) => event.stopPropagation()}>
        <header className="theme-gallery-header">
          <div><h2 id={titleId}>Elige tu tema</h2>
            <p id={descriptionId}>Pruébalos al instante. Tu elección se guarda en este dispositivo.</p></div>
          <button type="button" className="workspace-icon-button" onClick={onClose} aria-label="Cerrar temas"><X size={20} /></button>
        </header>
        <div className="theme-gallery-content">
          {(['dark', 'light'] as const).map((scheme) => {
            const Icon = scheme === 'dark' ? Moon : Sun;
            return <fieldset key={scheme} className="theme-family">
              <legend><Icon size={15} aria-hidden="true" />{scheme === 'dark' ? 'Temas oscuros' : 'Temas claros'}
                <span>{THEMES.filter((option) => option.colorScheme === scheme).length}</span></legend>
              <div className="theme-options">
                {THEMES.filter((option) => option.colorScheme === scheme).map((option) => (
                  <label key={option.id} className="theme-option" data-selected={option.id === theme}>
                    <input type="radio" name={groupName} value={option.id} checked={option.id === theme}
                      aria-label={option.label} onChange={() => setTheme(option.id)} />
                    <span className="theme-option-preview" aria-hidden="true" style={{ background: option.browserColor }}>
                      <span className="theme-preview-sidebar" style={{ background: option.surfaceColor }} />
                      <span className="theme-preview-card" style={{ background: option.surfaceColor }}>
                        <span style={{ background: option.accentColor }} /><i style={{ background: option.accentColor }} />
                      </span>
                      <span className="theme-preview-line" style={{ background: option.accentColor }} />
                      {option.id === theme && <span className="theme-option-check" style={{ background: option.accentColor,
                        color: option.colorScheme === 'dark' ? option.browserColor : '#fff' }}><Check size={13} strokeWidth={3} /></span>}
                    </span>
                    <span className="theme-option-name">{option.label}</span>
                    <span className="theme-option-description">{option.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>;
          })}
        </div>
        <footer className="theme-gallery-footer">
          <p role="status"><span aria-hidden="true" style={{ background: current.accentColor }} />{current.label}</p>
          <button type="button" className="btn-primary" onClick={onClose}>Listo</button>
        </footer>
      </div>
    </div>
  </DialogPortal>;
}
