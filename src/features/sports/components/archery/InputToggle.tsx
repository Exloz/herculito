import React from 'react';

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

  return (
    <div
      className="flex items-center gap-2"
      role="radiogroup"
      aria-label="Método de entrada de puntuación"
    >
      <button
        type="button"
        onClick={() => !isTargetMode && onToggle()}
        disabled={disabled}
        className={`
          relative flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200
          touch-target select-none
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isTargetMode
            ? 'bg-mint/20 border border-mint/50 text-mint'
            : 'bg-slateDeep/50 border border-mist/40 text-slate-400 hover:border-mint/30 hover:text-slate-300'
          }
        `}
        role="radio"
        aria-checked={isTargetMode}
      >
        <TargetIcon className="w-4 h-4" />
        <span className="text-sm font-medium">Diana</span>
      </button>

      <button
        type="button"
        onClick={() => isTargetMode && onToggle()}
        disabled={disabled}
        className={`
          relative flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200
          touch-target select-none
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${!isTargetMode
            ? 'bg-amberGlow/20 border border-amberGlow/50 text-amberGlow'
            : 'bg-slateDeep/50 border border-mist/40 text-slate-400 hover:border-amberGlow/30 hover:text-slate-300'
          }
        `}
        role="radio"
        aria-checked={!isTargetMode}
      >
        <NumpadIcon className="w-4 h-4" />
        <span className="text-sm font-medium">Teclado</span>
      </button>
    </div>
  );
};
