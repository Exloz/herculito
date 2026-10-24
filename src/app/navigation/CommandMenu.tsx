import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CornerDownLeft, Moon, Search, Sun, X } from 'lucide-react';
import type { AppPage } from '../hooks/usePageNavigation';
import { useTheme } from '../theme/theme-context';
import { DialogPortal } from '../../shared/ui/DialogPortal';
import { useDialogA11y } from '../../shared/hooks/useDialogA11y';
import { DESTINATIONS, normalizeCommandSearch } from './destinations';

interface CommandMenuProps {
  isAdmin: boolean;
  onNavigate: (page: AppPage) => void;
  onClose: () => void;
}

export function CommandMenu({ isAdmin, onNavigate, onClose }: CommandMenuProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  useDialogA11y(dialogRef, { onClose });

  const actions = [
    ...DESTINATIONS.filter((item) => isAdmin || item.page !== 'admin').map((item) => ({
      id: item.page, label: item.label, description: item.description, icon: item.icon,
      run: () => onNavigate(item.page)
    })),
    { id: 'theme', label: theme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro',
      description: 'Cambiar apariencia', icon: theme === 'dark' ? Sun : Moon,
      run: () => setTheme(theme === 'dark' ? 'light' : 'dark') }
  ].filter((item) => normalizeCommandSearch(`${item.label} ${item.description}`).includes(normalizeCommandSearch(query)));

  useEffect(() => {
    resultsRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const run = (index: number) => {
    const action = actions[index];
    if (!action) return;
    onClose();
    action.run();
  };

  return (
    <DialogPortal>
      <div className="command-backdrop" onClick={onClose}>
        <div ref={dialogRef} className="command-dialog" role="dialog" aria-modal="true"
          aria-labelledby="command-title" onClick={(event) => event.stopPropagation()}>
          <h2 id="command-title" className="sr-only">Buscar y navegar</h2>
          <div className="command-input-row">
            <Search size={20} aria-hidden="true" />
            <input value={query} placeholder="¿A dónde quieres ir?" aria-label="Buscar acciones"
              role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="command-results"
              aria-activedescendant={actions[selected] ? `command-${actions[selected].id}` : undefined}
              onChange={(event) => { setQuery(event.target.value); setSelected(0); }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  event.preventDefault();
                  setSelected((index) => actions.length ? (index + (event.key === 'ArrowDown' ? 1 : -1) + actions.length) % actions.length : 0);
                }
                if (event.key === 'Enter') { event.preventDefault(); run(selected); }
              }} />
            <button type="button" className="workspace-icon-button" onClick={onClose} aria-label="Cerrar búsqueda"><X size={18} /></button>
          </div>
          <p className="command-caption">Navegación y acciones</p>
          <div ref={resultsRef} id="command-results" role="listbox" aria-label="Acciones disponibles" className="command-results">
            {actions.map((action, index) => {
              const Icon = action.icon;
              return <div key={action.id} id={`command-${action.id}`} role="option" aria-selected={selected === index}
                className="command-result" onPointerMove={() => setSelected(index)} onClick={() => run(index)}>
                <Icon size={18} aria-hidden="true" />
                <span><strong>{action.label}</strong><small>{action.description}</small></span>
                <ArrowRight size={15} aria-hidden="true" />
              </div>;
            })}
          </div>
          {!actions.length && <p className="command-empty" role="status">Sin resultados. Prueba con «rutinas», «calendario» o «tema».</p>}
          <div className="command-footer"><span>↑ ↓ para moverte</span><span><CornerDownLeft size={13} /> para abrir</span><span>Esc para cerrar</span></div>
        </div>
      </div>
    </DialogPortal>
  );
}
