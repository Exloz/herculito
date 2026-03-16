import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface AppComboboxOption {
  value: string;
  label: string;
  groupLabel?: string;
}

interface AppComboboxProps {
  id?: string;
  value: string;
  options: AppComboboxOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  noResultsText?: string;
  triggerClassName?: string;
  panelClassName?: string;
}

const normalizeSearchText = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

export const AppCombobox: React.FC<AppComboboxProps> = ({
  id,
  value,
  options,
  onChange,
  placeholder = 'Selecciona una opción',
  disabled = false,
  searchable = true,
  searchPlaceholder = 'Buscar opción',
  noResultsText = 'Sin resultados',
  triggerClassName,
  panelClassName
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const [panelListMaxHeight, setPanelListMaxHeight] = useState<number>(288);

  const selectedOption = useMemo(() => {
    return options.find((option) => option.value === value) ?? null;
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchTerm);
    if (!normalizedSearch) {
      return options;
    }

    return options.filter((option) => normalizeSearchText(option.label).includes(normalizedSearch));
  }, [options, searchTerm]);

  const groupedOptions = useMemo(() => {
    const grouped = new Map<string, AppComboboxOption[]>();

    filteredOptions.forEach((option) => {
      const key = option.groupLabel ?? '';
      const current = grouped.get(key) ?? [];
      current.push(option);
      grouped.set(key, current);
    });

    return Array.from(grouped.entries()).map(([groupLabel, groupOptions]) => ({
      groupLabel,
      options: groupOptions
    }));
  }, [filteredOptions]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const updatePanelPosition = () => {
      const triggerElement = triggerRef.current;
      if (!triggerElement) {
        return;
      }

      const rect = triggerElement.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const viewportOffsetTop = window.visualViewport?.offsetTop ?? 0;
      const viewportOffsetLeft = window.visualViewport?.offsetLeft ?? 0;
      const edgeMargin = 8;
      const panelGap = 8;
      const minPanelHeight = 170;

      const availableBelow = viewportHeight - rect.bottom - panelGap - edgeMargin;
      const availableAbove = rect.top - panelGap - edgeMargin;
      const openUpwards = availableBelow < minPanelHeight && availableAbove > availableBelow;
      const availableHeight = openUpwards ? availableAbove : availableBelow;
      const computedMaxHeight = Math.max(140, Math.floor(availableHeight));

      const left = Math.max(
        edgeMargin,
        Math.min(rect.left + viewportOffsetLeft, viewportWidth - rect.width - edgeMargin)
      );

      const top = openUpwards
        ? viewportOffsetTop + rect.top - panelGap
        : viewportOffsetTop + rect.bottom + panelGap;

      setPanelStyle({
        position: 'fixed',
        left,
        top,
        width: rect.width,
        transform: openUpwards ? 'translateY(-100%)' : undefined,
        zIndex: 80
      });
      setPanelListMaxHeight(computedMaxHeight);
    };

    const focusTimer = window.setTimeout(() => {
      if (searchable) {
        searchInputRef.current?.focus();
      }
    }, 0);

    updatePanelPosition();

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!rootRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleWindowChange = () => {
      updatePanelPosition();
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);
    window.visualViewport?.addEventListener('resize', handleWindowChange);
    window.visualViewport?.addEventListener('scroll', handleWindowChange);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
      window.visualViewport?.removeEventListener('resize', handleWindowChange);
      window.visualViewport?.removeEventListener('scroll', handleWindowChange);
    };
  }, [isOpen, searchable]);

  const triggerClasses = [
    'input input-sm touch-target flex w-full items-center justify-between gap-2 text-left',
    triggerClassName ?? ''
  ].join(' ').trim();

  const panelClasses = [
    'z-30 overflow-hidden rounded-[1rem] border border-mist/60 bg-charcoal shadow-lift',
    panelClassName ?? ''
  ].join(' ').trim();

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setIsOpen((current) => !current);
        }}
        className={triggerClasses}
      >
        <span className="truncate text-sm text-slate-100">{selectedOption?.label ?? placeholder}</span>
        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-slate-200' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div className={panelClasses} style={panelStyle}>
          {searchable && (
            <div className="border-b border-white/8 p-2.5">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="input input-sm touch-target pl-8 pr-8"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={searchPlaceholder}
                />
                {searchTerm.trim() && (
                  <button
                    type="button"
                    aria-label="Limpiar búsqueda"
                    onClick={() => setSearchTerm('')}
                    className="motion-interactive touch-target-sm absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-white"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="overflow-y-auto overscroll-contain p-2" style={{ maxHeight: `${panelListMaxHeight}px` }}>
            {groupedOptions.length === 0 ? (
              <div className="rounded-[0.85rem] bg-white/[0.04] px-3 py-5 text-center text-xs text-slate-400">
                {noResultsText}
              </div>
            ) : (
              <div className="space-y-2.5">
                {groupedOptions.map((group) => (
                  <div key={group.groupLabel || 'default'} className="rounded-[0.85rem] bg-white/[0.02] p-1.5">
                    {group.groupLabel ? (
                      <div className="mb-1 px-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {group.groupLabel}
                      </div>
                    ) : null}

                    <div className="space-y-1.5">
                      {group.options.map((option) => {
                        const isSelected = option.value === value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              onChange(option.value);
                              setIsOpen(false);
                            }}
                            className={`motion-interactive touch-target flex w-full items-center justify-between gap-2 rounded-[0.75rem] px-2.5 py-2 text-left ${isSelected ? 'bg-mint/12 text-white' : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'}`}
                          >
                            <span className="truncate text-sm">{option.label}</span>
                            {isSelected ? <Check size={13} className="shrink-0 text-mint" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
