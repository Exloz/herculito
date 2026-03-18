import React from 'react';

interface ArrowInputProps {
  score: number | null;
  isGold?: boolean;
  isActive?: boolean;
  isEditing?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export const ArrowInput: React.FC<ArrowInputProps> = ({
  score,
  isGold = false,
  isActive = false,
  isEditing = false,
  onClick,
  disabled = false
}) => {
  const isInteractive = !disabled && score !== null && Boolean(onClick);

  const getDisplayValue = () => {
    if (score === null) return '';
    if (isGold) return 'X';
    return score.toString();
  };

  const getClassName = () => {
    const classes = ['arrow-input'];

    if (score === null) {
      classes.push('empty');
    } else if (isGold) {
      classes.push('gold');
    } else {
      classes.push('filled');
    }

    if (isActive) {
      classes.push('active');
    }

    if (isEditing) {
      classes.push('editing');
    }

    if (disabled) {
      classes.push('opacity-40');
    }

    if (isInteractive) {
      classes.push('is-clickable');
    }

    return classes.join(' ');
  };

  const getAriaLabel = () => {
    if (score === null) {
      return isActive ? 'Flecha activa, sin puntuar' : 'Flecha sin puntuar';
    }
    if (isGold) {
      return isActive ? `Flecha activa: X puntos de oro` : `Flecha: X puntos de oro`;
    }
    return isActive ? `Flecha activa: ${score} puntos` : `Flecha: ${score} puntos`;
  };

  const content = (
    <>
      <span className="relative z-10">{getDisplayValue()}</span>
      {isActive && (
        <span className="arrow-input-indicator" />
      )}
    </>
  );

  if (!isInteractive) {
    return (
      <div
        className={getClassName()}
        aria-label={getAriaLabel()}
        aria-current={isActive ? 'true' : undefined}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={getClassName()}
      aria-label={getAriaLabel()}
      aria-current={isActive ? 'true' : undefined}
      aria-pressed={isEditing ? 'true' : undefined}
    >
      {content}
    </button>
  );
};
