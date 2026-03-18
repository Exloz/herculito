import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowInput } from './ArrowInput';
import { ScoreNumpad } from './ScoreNumpad';
import { TargetFace } from './TargetFace';
import { InputToggle } from './InputToggle';
import { Check, RotateCcw } from 'lucide-react';

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
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  const handleShortcutKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
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

    if (event.key.toLowerCase() === 'd' || event.key === '+') {
      event.preventDefault();
      handleScore(10, false);
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
  }, [currentIndex, disabled, editingIndex, handleMiss, handleScore, arrowsPerEnd]);

  const subtotal = arrows.reduce((sum, arrow) => sum + (arrow.score ?? 0), 0);
  const goldCount = arrows.filter((arrow) => arrow.isGold).length;
  const activeArrowNumber = activeIndex < arrowsPerEnd ? activeIndex + 1 : null;

  const shouldShowInput = !isComplete || editingIndex !== null;

  return (
    <div
      ref={containerRef}
      className="end-input-compact"
      tabIndex={-1}
      onKeyDown={handleShortcutKeyDown}
      onPointerDownCapture={(event) => {
        if (event.target instanceof Element && !event.target.closest('button')) {
          containerRef.current?.focus();
        }
      }}
    >
      {/* Header compacto */}
      <div className="end-input-top">
        <div className="end-input-scoreline">
          <span className="end-total">{subtotal}</span>
          <span className="end-pts">pts</span>
          {goldCount > 0 && <span className="end-golds">{goldCount}X</span>}
        </div>
        <div className="end-status">
          {editingIndex !== null ? (
            <span className="end-editing">Editando {editingIndex + 1}</span>
          ) : isComplete ? (
            <span className="end-complete">Completa</span>
          ) : (
            <span className="end-active">Flecha {currentIndex + 1}/{arrowsPerEnd}</span>
          )}
        </div>
      </div>

      {/* Flechas */}
      <div className="end-arrows-row">
        {arrows.map((arrow, index) => (
          <ArrowInput
            key={index}
            score={arrow.score}
            isGold={arrow.isGold}
            isActive={activeArrowNumber !== null && index === activeIndex}
            isEditing={index === editingIndex}
            onClick={() => handleArrowClick(index)}
            disabled={disabled || isSubmitting}
          />
        ))}
      </div>

      {/* Toggle */}
      <InputToggle
        mode={inputMode}
        onToggle={handleToggleMode}
        disabled={disabled || isSubmitting}
      />

      {/* Input area */}
      {shouldShowInput && (
        <>
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

          {(hasEntries || editingIndex !== null) && (
            <button
              type="button"
              onClick={editingIndex !== null ? handleCancelEditing : handleUndo}
              disabled={disabled || isSubmitting}
              className="end-undo-btn"
            >
              <RotateCcw size={14} />
              {editingIndex !== null ? 'Cancelar' : 'Deshacer'}
            </button>
          )}
        </>
      )}

      {/* Completion */}
      {isComplete && editingIndex === null && (
        <div className="end-complete-actions">
          <button
            type="button"
            onClick={handleComplete}
            disabled={disabled || isSubmitting}
            className="end-confirm-btn"
          >
            <Check size={18} />
            {isSubmitting ? 'Guardando...' : 'Confirmar'}
          </button>

          <button
            type="button"
            onClick={handleUndo}
            disabled={disabled || isSubmitting}
            className="end-correct-btn"
          >
            Corregir
          </button>

          {submitError && <p className="end-error">{submitError}</p>}
        </div>
      )}

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled || isSubmitting}
          className="end-cancel-btn"
        >
          Cancelar
        </button>
      )}
    </div>
  );
};
