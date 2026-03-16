import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useDialogA11y } from '../hooks/useDialogA11y';

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

interface GroupedOptionEntry {
  option: AppComboboxOption;
  flatIndex: number;
}

interface GroupedOptionSection {
  groupLabel: string;
  options: GroupedOptionEntry[];
}

const MOBILE_MEDIA_QUERY = '(max-width: 767px), (pointer: coarse)';
const DESKTOP_PANEL_EDGE_MARGIN = 8;
const DESKTOP_PANEL_GAP = 8;
const DESKTOP_PANEL_MIN_HEIGHT = 188;
const DESKTOP_PANEL_MIN_WIDTH = 280;
const DESKTOP_PANEL_MAX_WIDTH = 420;
const DESKTOP_PANEL_MAX_HEIGHT = 380;

const normalizeSearchText = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const getMobileViewportMaxHeight = (): string => {
  return 'min(calc(100dvh - 1rem), 42rem)';
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
  const generatedId = useId().replace(/:/g, '');
  const triggerId = id ?? `app-combobox-${generatedId}`;
  const panelId = `${triggerId}-panel`;
  const titleId = `${triggerId}-title`;
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileSheet, setIsMobileSheet] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const [panelListMaxHeight, setPanelListMaxHeight] = useState<number>(288);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

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

  const groupedOptions = useMemo<GroupedOptionSection[]>(() => {
    const grouped = new Map<string, GroupedOptionEntry[]>();
    let flatIndex = 0;

    filteredOptions.forEach((option) => {
      const key = option.groupLabel ?? '';
      const current = grouped.get(key) ?? [];
      current.push({ option, flatIndex });
      grouped.set(key, current);
      flatIndex += 1;
    });

    return Array.from(grouped.entries()).map(([groupLabel, groupEntries]) => ({
      groupLabel,
      options: groupEntries
    }));
  }, [filteredOptions]);

  const flatOptions = useMemo(() => {
    return groupedOptions.flatMap((group) => group.options);
  }, [groupedOptions]);

  const selectedFlatIndex = useMemo(() => {
    return flatOptions.findIndex((entry) => entry.option.value === value);
  }, [flatOptions, value]);

  const closePanel = useCallback(() => {
    setIsOpen(false);
    setSearchTerm('');
  }, []);

  const openPanel = useCallback(() => {
    if (disabled) {
      return;
    }

    setIsOpen(true);
  }, [disabled]);

  const handleSelect = useCallback((nextValue: string) => {
    onChange(nextValue);
    closePanel();
  }, [closePanel, onChange]);

  const moveActiveIndex = useCallback((direction: 1 | -1) => {
    setActiveIndex((current) => {
      if (flatOptions.length === 0) {
        return -1;
      }

      if (current < 0) {
        return direction > 0 ? 0 : flatOptions.length - 1;
      }

      return (current + direction + flatOptions.length) % flatOptions.length;
    });
  }, [flatOptions.length]);

  const selectActiveOption = useCallback(() => {
    if (activeIndex < 0) {
      return;
    }

    const activeEntry = flatOptions[activeIndex];
    if (!activeEntry) {
      return;
    }

    handleSelect(activeEntry.option.value);
  }, [activeIndex, flatOptions, handleSelect]);

  const handleInteractionKeyDown = useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();

      if (!isOpen) {
        openPanel();
        return;
      }

      moveActiveIndex(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();

      if (!isOpen) {
        openPanel();
        return;
      }

      moveActiveIndex(-1);
      return;
    }

    if (!isOpen) {
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(flatOptions.length > 0 ? 0 : -1);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(flatOptions.length > 0 ? flatOptions.length - 1 : -1);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      selectActiveOption();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closePanel();
    }
  }, [closePanel, flatOptions.length, isOpen, moveActiveIndex, openPanel, selectActiveOption]);

  useDialogA11y(panelRef, {
    enabled: isOpen && isMobileSheet,
    onClose: closePanel
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    const syncMobileState = () => {
      setIsMobileSheet(mediaQuery.matches);
    };

    syncMobileState();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncMobileState);
      return () => mediaQuery.removeEventListener('change', syncMobileState);
    }

    mediaQuery.addListener(syncMobileState);
    return () => mediaQuery.removeListener(syncMobileState);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(-1);
      return;
    }

    if (flatOptions.length === 0) {
      setActiveIndex(-1);
      return;
    }

    setActiveIndex((current) => {
      if (current >= 0 && current < flatOptions.length) {
        return current;
      }

      return selectedFlatIndex >= 0 ? selectedFlatIndex : 0;
    });
  }, [flatOptions, isOpen, selectedFlatIndex]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const focusTimer = window.setTimeout(() => {
      if (searchable) {
        searchInputRef.current?.focus();
        return;
      }

      if (activeIndex >= 0) {
        optionRefs.current[activeIndex]?.focus();
      }
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
    };
  }, [activeIndex, isOpen, searchable]);

  useEffect(() => {
    if (!isOpen || activeIndex < 0) {
      return;
    }

    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  const updateDesktopPanelPosition = useCallback(() => {
    const triggerElement = triggerRef.current;
    if (!triggerElement || typeof window === 'undefined') {
      return;
    }

    const rect = triggerElement.getBoundingClientRect();
    const viewport = window.visualViewport;
    const viewportHeight = viewport?.height ?? window.innerHeight;
    const viewportWidth = viewport?.width ?? window.innerWidth;
    const viewportOffsetTop = viewport?.offsetTop ?? 0;
    const viewportOffsetLeft = viewport?.offsetLeft ?? 0;
    const availableBelow = viewportHeight - rect.bottom - DESKTOP_PANEL_GAP - DESKTOP_PANEL_EDGE_MARGIN;
    const availableAbove = rect.top - DESKTOP_PANEL_GAP - DESKTOP_PANEL_EDGE_MARGIN;
    const shouldOpenUpward = availableBelow < DESKTOP_PANEL_MIN_HEIGHT && availableAbove > availableBelow;
    const availableHeight = shouldOpenUpward ? availableAbove : availableBelow;
    const width = Math.min(
      Math.max(rect.width, DESKTOP_PANEL_MIN_WIDTH),
      Math.min(DESKTOP_PANEL_MAX_WIDTH, Math.max(220, viewportWidth - DESKTOP_PANEL_EDGE_MARGIN * 2))
    );
    const left = Math.min(
      Math.max(rect.left + viewportOffsetLeft, DESKTOP_PANEL_EDGE_MARGIN),
      viewportOffsetLeft + viewportWidth - width - DESKTOP_PANEL_EDGE_MARGIN
    );
    const top = shouldOpenUpward
      ? viewportOffsetTop + rect.top - DESKTOP_PANEL_GAP
      : viewportOffsetTop + rect.bottom + DESKTOP_PANEL_GAP;

    setPanelStyle({
      position: 'fixed',
      top,
      left,
      width,
      transform: shouldOpenUpward ? 'translateY(-100%)' : undefined,
      zIndex: 80
    });
    setPanelListMaxHeight(
      Math.max(176, Math.min(DESKTOP_PANEL_MAX_HEIGHT, Math.floor(availableHeight)))
    );
  }, []);

  useEffect(() => {
    if (!isOpen || isMobileSheet || typeof window === 'undefined') {
      return;
    }

    updateDesktopPanelPosition();

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }

      closePanel();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePanel();
      }
    };

    const handleViewportChange = () => {
      updateDesktopPanelPosition();
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    window.visualViewport?.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('scroll', handleViewportChange);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, [closePanel, isMobileSheet, isOpen, updateDesktopPanelPosition]);

  const triggerClasses = [
    'input input-sm touch-target flex w-full items-center justify-between gap-2 text-left',
    disabled ? 'cursor-not-allowed opacity-60' : 'motion-interactive',
    triggerClassName ?? ''
  ].join(' ').trim();

  const panelClasses = [
    'overflow-hidden border border-mist/60 bg-[radial-gradient(circle_at_top_right,rgba(72,229,163,0.08),transparent_24%),linear-gradient(180deg,rgba(17,24,39,0.985),rgba(11,15,20,0.985))] shadow-lift backdrop-blur-xl',
    panelClassName ?? ''
  ].join(' ').trim();

  const resultsCountLabel = `${flatOptions.length} ${flatOptions.length === 1 ? 'resultado visible' : 'resultados visibles'}`;

  const optionsContent = groupedOptions.length === 0 ? (
    <div className="rounded-[1rem] border border-white/6 bg-white/[0.04] px-3 py-6 text-center text-xs text-slate-400">
      {noResultsText}
    </div>
  ) : (
    <div
      className="space-y-2.5"
      role="listbox"
      id={panelId}
      aria-activedescendant={activeIndex >= 0 ? `${panelId}-option-${activeIndex}` : undefined}
    >
      {groupedOptions.map((group) => (
        <div
          key={group.groupLabel || 'default'}
          className="rounded-[1rem] border border-white/6 bg-white/[0.025] p-1.5"
        >
          {group.groupLabel ? (
            <div className="mb-1 px-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {group.groupLabel}
            </div>
          ) : null}

          <div className="space-y-1.5">
            {group.options.map((entry) => {
              const isSelected = entry.option.value === value;
              const isActive = entry.flatIndex === activeIndex;

              return (
                <button
                  key={entry.option.value}
                  id={`${panelId}-option-${entry.flatIndex}`}
                  ref={(element) => {
                    optionRefs.current[entry.flatIndex] = element;
                  }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseMove={() => {
                    if (activeIndex !== entry.flatIndex) {
                      setActiveIndex(entry.flatIndex);
                    }
                  }}
                  onClick={() => handleSelect(entry.option.value)}
                  className={[
                    'touch-target flex w-full items-center justify-between gap-3 rounded-[0.9rem] border px-3 py-2.5 text-left text-sm transition-colors',
                    isSelected
                      ? 'border-mint/25 bg-mint/14 text-white shadow-[0_10px_22px_rgba(72,229,163,0.12)]'
                      : isActive
                        ? 'border-white/10 bg-white/[0.08] text-white'
                        : 'border-transparent text-slate-300 hover:border-white/8 hover:bg-white/[0.05] hover:text-white'
                  ].join(' ')}
                >
                  <span className="min-w-0 truncate">{entry.option.label}</span>
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/8 bg-black/10">
                    {isSelected ? <Check size={13} className="text-mint" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const searchBox = searchable ? (
    <div className="border-b border-white/8 p-3">
      <label htmlFor={`${triggerId}-search`} className="sr-only">{searchPlaceholder}</label>
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          ref={searchInputRef}
          id={`${triggerId}-search`}
          type="text"
          className="input touch-target pl-9 pr-9 text-sm"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          onKeyDown={handleInteractionKeyDown}
          placeholder={searchPlaceholder}
        />
        {searchTerm.trim() ? (
          <button
            type="button"
            aria-label="Limpiar búsqueda"
            onClick={() => setSearchTerm('')}
            className="motion-interactive touch-target-sm absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-white"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>
    </div>
  ) : null;

  const desktopPanel = !isMobileSheet ? (
    <div
      ref={panelRef}
      className={`motion-pop-in rounded-[1.25rem] ${panelClasses}`}
      style={panelStyle}
      onKeyDown={handleInteractionKeyDown}
    >
      {searchBox}
      <div
        className="overscroll-contain p-2.5"
        style={{
          maxHeight: `${panelListMaxHeight}px`,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {optionsContent}
      </div>
    </div>
  ) : null;

  const mobilePanel = isMobileSheet ? (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-2 sm:p-4">
      <button
        type="button"
        aria-label="Cerrar selector"
        className="motion-dialog-backdrop absolute inset-0 bg-[rgba(3,7,18,0.76)] backdrop-blur-[10px]"
        onClick={closePanel}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`motion-dialog-panel relative z-[81] flex w-full max-w-lg flex-col overflow-hidden rounded-[1.75rem] ${panelClasses}`}
        style={{ maxHeight: getMobileViewportMaxHeight() }}
        onKeyDown={handleInteractionKeyDown}
      >
        <div className="shrink-0 px-4 pb-3 pt-[calc(0.6rem+env(safe-area-inset-top))] sm:px-5">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-white/12" />
          <div className="mt-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mint/80">Selector</div>
              <div id={titleId} className="mt-1 font-display text-xl leading-none text-white">
                {selectedOption?.label ?? placeholder}
              </div>
              <div className="mt-1 text-xs text-slate-400">{resultsCountLabel}</div>
            </div>
            <button
              type="button"
              onClick={closePanel}
              className="motion-interactive touch-target flex h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-white/[0.04] text-slate-300 hover:text-white"
              aria-label="Cerrar selector"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {searchBox}

        <div
          className="min-h-0 flex-1 overscroll-contain px-3 pb-[calc(0.9rem+env(safe-area-inset-bottom))] sm:px-4"
          style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
        >
          {optionsContent}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-haspopup={isMobileSheet ? 'dialog' : 'listbox'}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={() => {
          if (isOpen) {
            closePanel();
            return;
          }

          openPanel();
        }}
        onKeyDown={handleInteractionKeyDown}
        className={triggerClasses}
      >
        <span className="min-w-0 flex-1 truncate text-sm text-slate-100">{selectedOption?.label ?? placeholder}</span>
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/[0.04] text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-slate-200' : ''}`}>
          <ChevronDown size={14} />
        </span>
      </button>

      {isOpen && typeof document !== 'undefined'
        ? createPortal(mobilePanel ?? desktopPanel, document.body)
        : null}
    </div>
  );
};
