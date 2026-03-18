import React, { useRef } from 'react';

interface InputToggleProps {
  mode: 'target' | 'numpad';
  onToggle: () => void;
  disabled?: boolean;
}

const TargetIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const NumpadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

export const InputToggle: React.FC<InputToggleProps> = ({
  mode,
  onToggle,
  disabled = false
}) => {
  const isTargetMode = mode === 'target';
  const targetRef = useRef<HTMLButtonElement | null>(null);
  const numpadRef = useRef<HTMLButtonElement | null>(null);

  const selectMode = (nextMode: 'target' | 'numpad') => {
    if (disabled || nextMode === mode) {
      return;
    }

    onToggle();
  };

  const handleRadioKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, nextMode: 'target' | 'numpad') => {
    if (disabled) {
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      selectMode('target');
      targetRef.current?.focus();
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      selectMode('numpad');
      numpadRef.current?.focus();
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      selectMode('target');
      targetRef.current?.focus();
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      selectMode('numpad');
      numpadRef.current?.focus();
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      selectMode(nextMode);
    }
  };

  return (
    <div className="input-toggle-container">
      <div 
        className="input-toggle-track"
        role="radiogroup"
        aria-label="Método de entrada de puntuación"
      >
        {/* Slider background */}
        <div 
          className="input-toggle-slider"
          style={{
            width: ' calc(50% - 4px)',
            transform: isTargetMode ? 'translateX(0)' : 'translateX(calc(100% + 8px))'
          }}
        />
        
        {/* Target/Diana option */}
        <button
          ref={targetRef}
          type="button"
          onClick={() => selectMode('target')}
          disabled={disabled}
          className={`
            input-toggle-option
            ${isTargetMode ? 'active' : 'inactive'}
          `}
          role="radio"
          aria-checked={isTargetMode}
          tabIndex={isTargetMode ? 0 : -1}
          onKeyDown={(event) => handleRadioKeyDown(event, 'target')}
        >
          <TargetIcon className="w-5 h-5" />
          <span className="text-sm font-semibold">Diana</span>
        </button>

        {/* Numpad/Teclado option */}
        <button
          ref={numpadRef}
          type="button"
          onClick={() => selectMode('numpad')}
          disabled={disabled}
          className={`
            input-toggle-option
            ${!isTargetMode ? 'active' : 'inactive'}
          `}
          role="radio"
          aria-checked={!isTargetMode}
          tabIndex={!isTargetMode ? 0 : -1}
          onKeyDown={(event) => handleRadioKeyDown(event, 'numpad')}
        >
          <NumpadIcon className="w-5 h-5" />
          <span className="text-sm font-semibold">Teclado</span>
        </button>
      </div>
    </div>
  );
};
