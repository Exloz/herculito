import React from 'react';

interface ScoreNumpadProps {
  onScore: (score: number, isGold: boolean) => void;
  onMiss: () => void;
  disabled?: boolean;
}

export const ScoreNumpad: React.FC<ScoreNumpadProps> = ({
  onScore,
  onMiss,
  disabled = false
}) => {
  const handleScore = (score: number, isGold: boolean = false) => {
    if (!disabled) {
      onScore(score, isGold);
    }
  };

  const handleMiss = () => {
    if (!disabled) {
      onMiss();
    }
  };

  return (
    <div className="score-numpad">
      {/* Row 1: 7, 8, 9 (Blue and Red rings) */}
      <button
        type="button"
        onClick={() => handleScore(7)}
        disabled={disabled}
        className="score-blue touch-target"
        aria-label="Siete puntos"
      >
        7
      </button>
      <button
        type="button"
        onClick={() => handleScore(8)}
        disabled={disabled}
        className="score-blue touch-target"
        aria-label="Ocho puntos"
      >
        8
      </button>
      <button
        type="button"
        onClick={() => handleScore(9)}
        disabled={disabled}
        className="score-red touch-target"
        aria-label="Nueve puntos"
      >
        9
      </button>

      {/* Row 2: 4, 5, 6 (Black and Blue rings) */}
      <button
        type="button"
        onClick={() => handleScore(4)}
        disabled={disabled}
        className="score-black touch-target"
        aria-label="Cuatro puntos"
      >
        4
      </button>
      <button
        type="button"
        onClick={() => handleScore(5)}
        disabled={disabled}
        className="score-black touch-target"
        aria-label="Cinco puntos"
      >
        5
      </button>
      <button
        type="button"
        onClick={() => handleScore(6)}
        disabled={disabled}
        className="score-blue touch-target"
        aria-label="Seis puntos"
      >
        6
      </button>

      {/* Row 3: 1, 2, 3 (White ring) */}
      <button
        type="button"
        onClick={() => handleScore(1)}
        disabled={disabled}
        className="score-white touch-target"
        aria-label="Un punto"
      >
        1
      </button>
      <button
        type="button"
        onClick={() => handleScore(2)}
        disabled={disabled}
        className="score-white touch-target"
        aria-label="Dos puntos"
      >
        2
      </button>
      <button
        type="button"
        onClick={() => handleScore(3)}
        disabled={disabled}
        className="score-white touch-target"
        aria-label="Tres puntos"
      >
        3
      </button>

      {/* Row 4: 10, X, Miss */}
      <button
        type="button"
        onClick={() => handleScore(10, false)}
        disabled={disabled}
        className="gold touch-target"
        aria-label="Diez puntos"
      >
        10
      </button>
      <button
        type="button"
        onClick={() => handleScore(10, true)}
        disabled={disabled}
        className="gold touch-target"
        aria-label="Diez de oro"
      >
        X
      </button>
      <button
        type="button"
        onClick={handleMiss}
        disabled={disabled}
        className="miss touch-target"
        aria-label="Fallo"
      >
        M
      </button>
    </div>
  );
};
