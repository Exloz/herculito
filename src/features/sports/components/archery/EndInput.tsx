import React, { useState, useCallback, useEffect } from 'react';
import { ArrowInput } from './ArrowInput';
import { ScoreNumpad } from './ScoreNumpad';
import { TargetFace } from './TargetFace';
import { InputToggle } from './InputToggle';
import { Check, RotateCcw } from 'lucide-react';

const STORAGE_KEY = 'herculito:archery:inputMode';

interface EndInputProps {
  arrowsPerEnd: number;
  onComplete: (arrows: { score: number; isGold: boolean }[]) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

export const EndInput: React.FC<EndInputProps> = ({
  arrowsPerEnd,
  onComplete,
  onCancel,
  disabled = false
}) => {
  const [arrows, setArrows] = useState<{ score: number | null; isGold: boolean }[]>(
    Array(arrowsPerEnd).fill(null).map(() => ({ score: null, isGold: false }))
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputMode, setInputMode] = useState<'target' | 'numpad'>('target');

  // Load saved preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'target' || saved === 'numpad') {
      setInputMode(saved);
    }
  }, []);

  // Save preference when it changes
  const handleToggleMode = useCallback(() => {
    const newMode = inputMode === 'target' ? 'numpad' : 'target';
    setInputMode(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  }, [inputMode]);

  const handleScore = useCallback((score: number, isGold: boolean) => {
    if (currentIndex >= arrowsPerEnd) return;

    const newArrows = [...arrows];
    newArrows[currentIndex] = { score, isGold };
    setArrows(newArrows);
    setCurrentIndex(currentIndex + 1);
  }, [arrows, currentIndex, arrowsPerEnd]);

  const handleMiss = useCallback(() => {
    handleScore(0, false);
  }, [handleScore]);

  const handleUndo = useCallback(() => {
    if (currentIndex > 0) {
      const newArrows = [...arrows];
      newArrows[currentIndex - 1] = { score: null, isGold: false };
      setArrows(newArrows);
      setCurrentIndex(currentIndex - 1);
    }
  }, [arrows, currentIndex]);

  const handleComplete = useCallback(() => {
    const completedArrows = arrows.filter((a): a is { score: number; isGold: boolean } => a.score !== null);
    if (completedArrows.length === arrowsPerEnd) {
      onComplete(completedArrows);
      // Reset for next end
      setArrows(Array(arrowsPerEnd).fill(null).map(() => ({ score: null, isGold: false })));
      setCurrentIndex(0);
    }
  }, [arrows, arrowsPerEnd, onComplete]);

  const isComplete = currentIndex >= arrowsPerEnd;
  const subtotal = arrows.reduce((sum, a) => sum + (a.score ?? 0), 0);
  const goldCount = arrows.filter(a => a.isGold).length;

  return (
    <div className="space-y-4">
      {/* Arrow Display */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        {arrows.map((arrow, index) => (
          <ArrowInput
            key={index}
            score={arrow.score}
            isGold={arrow.isGold}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Subtotal */}
      <div className="text-center">
        <div className="text-sm text-slate-400">
          Subtotal: <span className="text-white font-semibold">{subtotal}</span> pts
          {goldCount > 0 && (
            <span className="ml-2 text-amberGlow">{goldCount} Oro</span>
          )}
        </div>
        <div className="text-xs text-slate-500 mt-1">
          Flecha {Math.min(currentIndex + 1, arrowsPerEnd)} de {arrowsPerEnd}
        </div>
      </div>

      {/* Input Toggle */}
      <InputToggle
        mode={inputMode}
        onToggle={handleToggleMode}
        disabled={disabled}
      />

      {/* Numpad or Complete Button */}
      {!isComplete ? (
        <div className="space-y-3">
          {inputMode === 'target' ? (
            <TargetFace
              onScore={handleScore}
              onMiss={handleMiss}
              disabled={disabled}
            />
          ) : (
            <ScoreNumpad
              onScore={handleScore}
              onMiss={handleMiss}
              disabled={disabled}
            />
          )}
          {currentIndex > 0 && (
            <button
              type="button"
              onClick={handleUndo}
              disabled={disabled}
              className="w-full btn-secondary inline-flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} />
              <span>Deshacer última</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleComplete}
            disabled={disabled}
            className="w-full btn-primary inline-flex items-center justify-center gap-2"
          >
            <Check size={20} />
            <span>Confirmar tanda</span>
          </button>
          <button
            type="button"
            onClick={handleUndo}
            disabled={disabled}
            className="w-full btn-ghost inline-flex items-center justify-center gap-2 text-slate-400"
          >
            <RotateCcw size={16} />
            <span>Corregir</span>
          </button>
        </div>
      )}

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="w-full btn-ghost text-slate-400 text-sm"
        >
          Cancelar
        </button>
      )}
    </div>
  );
};
