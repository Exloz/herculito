import React from 'react';

interface ArrowInputProps {
  score: number | null;
  isGold?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export const ArrowInput: React.FC<ArrowInputProps> = ({
  score,
  isGold = false,
  onClick,
  disabled = false
}) => {
  const getDisplayValue = () => {
    if (score === null) return '';
    if (isGold) return 'X';
    return score.toString();
  };

  const getClassName = () => {
    const baseClass = 'arrow-input';
    if (score === null) return `${baseClass} empty`;
    if (isGold) return `${baseClass} gold`;
    return `${baseClass} filled`;
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={getClassName()}
      aria-label={score === null ? 'Flecha sin puntuar' : `Flecha: ${getDisplayValue()} puntos`}
    >
      {getDisplayValue()}
    </button>
  );
};
