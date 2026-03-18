import React, { useState, useCallback, useEffect } from 'react';
import { ArrowInput } from './ArrowInput';
import { ScoreNumpad } from './ScoreNumpad';
import { TargetFace } from './TargetFace';
import { InputToggle } from './InputToggle';
import { Check, RotateCcw, Edit3, Crosshair } from 'lucide-react';

const STORAGE_KEY = 'herculito:archery:inputMode';

interface EndInputProps {
  arrowsPerEnd: number;
  onComplete: (arrows: { score: number; isGold: boolean }[]) => void | Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
}

type ArrowValue = {
  score: number | null;
  isGold: boolean;
};

const createEmptyArrows = (count: number): ArrowValue[] => (
  Array.from({ length: count }, () => ({ score: null, isGold: false }))
);

export const EndInput: React.FC<EndInputProps> = ({
  arrowsPerEnd,
  onComplete,
  onCancel,
  disabled = false,
}) => {
  const [arrows, setArrows] = useState<ArrowValue[]>(() => createEmptyArrows(arrowsPerEnd));
  const [inputMode, setInputMode] = useState<'target' | 'numpad'>('target');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'target' || saved === 'numpad') {
      setInputMode(saved);
    }
  }, []);

  const handleToggleMode = useCallback(() => {
    const nextMode = inputMode === 'target' ? 'numpad' : 'target';
    setInputMode(nextMode);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, nextMode);
    }
  }, [inputMode]);

  const nextEmptyIndex = arrows.findIndex((arrow) => arrow.score === null);
  const currentIndex = nextEmptyIndex === -1 ? arrowsPerEnd : nextEmptyIndex;
  const activeIndex = editingIndex ?? currentIndex;
  const isComplete = currentIndex >= arrowsPerEnd;
  const hasEntries = arrows.some((arrow) => arrow.score !== null);

  const handleScore = useCallback((score: number, isGold: boolean) => {
    const targetIndex = editingIndex ?? currentIndex;
    if (targetIndex >= arrowsPerEnd) {
      return;
    }

    setArrows((previous) => {
      const next = [...previous];
      next[targetIndex] = { score, isGold };
      return next;
    });
    setEditingIndex(null);
    setSubmitError(null);
  }, [arrowsPerEnd, currentIndex, editingIndex]);

  const handleMiss = useCallback(() => {
    handleScore(0, false);
  }, [handleScore]);

  const handleArrowClick = useCallback((index: number) => {
    if (disabled || arrows[index].score === null) {
      return;
    }

    setEditingIndex(index);
  }, [arrows, disabled]);

  const handleCancelEditing = useCallback(() => {
    setEditingIndex(null);
  }, []);

  const handleUndo = useCallback(() => {
    if (disabled) {
      return;
    }

    if (editingIndex !== null) {
      setEditingIndex(null);
      return;
    }

    const filledEntries = [...arrows]
      .map((arrow, index) => ({ arrow, index }))
      .filter(({ arrow }) => arrow.score !== null);
    const lastFilledIndex = filledEntries.length > 0
      ? filledEntries[filledEntries.length - 1].index
      : undefined;

    if (lastFilledIndex === undefined) {
      return;
    }

    setArrows((previous) => {
      const next = [...previous];
      next[lastFilledIndex] = { score: null, isGold: false };
      return next;
    });
  }, [arrows, disabled, editingIndex]);

  const handleComplete = useCallback(async () => {
    const completedArrows = arrows.filter((arrow): arrow is { score: number; isGold: boolean } => arrow.score !== null);
    if (completedArrows.length !== arrowsPerEnd || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await Promise.resolve(onComplete(completedArrows));
      setArrows(createEmptyArrows(arrowsPerEnd));
      setEditingIndex(null);
    } catch {
      setSubmitError('No se pudo guardar la tanda. Reintenta.');
    } finally {
      setIsSubmitting(false);
    }
  }, [arrows, arrowsPerEnd, isSubmitting, onComplete]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (disabled) {
        return;
      }

      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.key === 'Escape') {
        setEditingIndex(null);
        return;
      }

      if (editingIndex === null && currentIndex >= arrowsPerEnd) {
        return;
      }

      if (event.key >= '0' && event.key <= '9') {
        event.preventDefault();
        handleScore(Number(event.key), false);
        return;
      }

      if (event.key.toLowerCase() === 'x') {
        event.preventDefault();
        handleScore(10, true);
        return;
      }

      if (event.key.toLowerCase() === 'm') {
        event.preventDefault();
        handleMiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [arrowsPerEnd, currentIndex, disabled, editingIndex, handleMiss, handleScore]);

  const subtotal = arrows.reduce((sum, arrow) => sum + (arrow.score ?? 0), 0);
  const goldCount = arrows.filter((arrow) => arrow.isGold).length;
  const activeArrowNumber = activeIndex < arrowsPerEnd ? activeIndex + 1 : null;
  const helperText = editingIndex !== null
    ? `Flecha ${editingIndex + 1} en edicion. Elige el nuevo puntaje.`
    : isComplete
      ? 'Revisa la tanda y confirma cuando este lista.'
      : `Flecha ${currentIndex + 1} de ${arrowsPerEnd}. Marca el puntaje.`;

  const shouldShowInput = !isComplete || editingIndex !== null;

  return (
    <div className="end-input-container">
      <div className="end-input-header">
        <div className="end-input-subtotal">
          <span className="end-input-subtotal-value">{subtotal}</span>
          <span className="text-slate-400">pts</span>
          {goldCount > 0 && (
            <span className="end-input-gold-badge">
              <span className="w-1.5 h-1.5 rounded-full bg-amberGlow" />
              {goldCount} Oro{goldCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="end-input-progress">
          {editingIndex !== null ? (
            <span className="active-arrow-indicator">
              <Edit3 size={14} />
              Editando flecha {editingIndex + 1}
            </span>
          ) : isComplete ? (
            <span className="end-complete-badge">
              <Check size={16} />
              Tanda completa
            </span>
          ) : (
            <span className="active-arrow-indicator">
              <Crosshair size={14} />
              Flecha activa {currentIndex + 1}
            </span>
          )}
        </div>

        <p className="end-input-helper">{helperText}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        {arrows.map((arrow, index) => (
          <ArrowInput
            key={index}
            score={arrow.score}
            isGold={arrow.isGold}
            isActive={activeArrowNumber !== null && index === activeIndex}
            isEditing={index === editingIndex}
            onClick={() => handleArrowClick(index)}
            disabled={disabled}
          />
        ))}
      </div>

      <InputToggle
        mode={inputMode}
        onToggle={handleToggleMode}
        disabled={disabled || isSubmitting}
      />

      {shouldShowInput && (
        <div className="space-y-3">
          {inputMode === 'target' ? (
            <TargetFace
              onScore={handleScore}
              onMiss={handleMiss}
              disabled={disabled || isSubmitting}
            />
          ) : (
            <ScoreNumpad
              onScore={handleScore}
              onMiss={handleMiss}
              disabled={disabled || isSubmitting}
            />
          )}

          <div className="flex gap-2">
            {hasEntries && editingIndex === null && (
              <button
                type="button"
                onClick={handleUndo}
                disabled={disabled || isSubmitting}
                className="flex-1 btn-secondary inline-flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} />
                <span>Deshacer</span>
              </button>
            )}

            {editingIndex !== null && (
              <button
                type="button"
                onClick={handleCancelEditing}
                disabled={disabled || isSubmitting}
                className="flex-1 btn-ghost inline-flex items-center justify-center gap-2 text-slate-400"
              >
                <span>Cancelar edicion</span>
              </button>
            )}
          </div>
        </div>
      )}

      {isComplete && editingIndex === null && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleComplete}
            disabled={disabled || isSubmitting}
            className="w-full btn-primary inline-flex items-center justify-center gap-2"
          >
            <Check size={20} />
            <span>{isSubmitting ? 'Guardando...' : 'Confirmar tanda'}</span>
          </button>

          <button
            type="button"
            onClick={handleUndo}
            disabled={disabled || isSubmitting}
            className="w-full btn-ghost inline-flex items-center justify-center gap-2 text-slate-400"
          >
            <RotateCcw size={16} />
            <span>Corregir</span>
          </button>

          {submitError && (
            <p className="text-center text-sm text-crimson">{submitError}</p>
          )}
        </div>
      )}

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled || isSubmitting}
          className="w-full btn-ghost text-slate-400 text-sm mt-2"
        >
          Cancelar
        </button>
      )}
    </div>
  );
};
