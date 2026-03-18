import React, { useState, useEffect, useRef, useCallback } from 'react';

interface TargetFaceProps {
  onScore: (score: number, isGold: boolean) => void;
  onMiss: () => void;
  disabled?: boolean;
}

interface RingInfo {
  score: number;
  isGold: boolean;
  radius: number;
  strokeWidth: number;
  color: string;
  label: string;
}

// Ring radii following WA standard proportions
// Total diameter 400px, so radius goes from 0 to 200
// Note: X (10 gold) is handled separately as a center button
const RINGS: RingInfo[] = [
  { score: 1, isGold: false, radius: 187.5, strokeWidth: 25, color: '#f3f4f6', label: 'Un punto (blanco)' },
  { score: 2, isGold: false, radius: 162.5, strokeWidth: 25, color: '#f3f4f6', label: 'Dos puntos (blanco)' },
  { score: 3, isGold: false, radius: 137.5, strokeWidth: 25, color: '#f3f4f6', label: 'Tres puntos (blanco)' },
  { score: 4, isGold: false, radius: 112.5, strokeWidth: 25, color: '#374151', label: 'Cuatro puntos (negro)' },
  { score: 5, isGold: false, radius: 87.5, strokeWidth: 25, color: '#374151', label: 'Cinco puntos (negro)' },
  { score: 6, isGold: false, radius: 62.5, strokeWidth: 25, color: '#374151', label: 'Seis puntos (negro)' },
  { score: 7, isGold: false, radius: 42.5, strokeWidth: 20, color: '#3b82f6', label: 'Siete puntos (azul)' },
  { score: 8, isGold: false, radius: 27.5, strokeWidth: 15, color: '#3b82f6', label: 'Ocho puntos (azul)' },
  { score: 9, isGold: false, radius: 17.5, strokeWidth: 15, color: '#ef4444', label: 'Nueve puntos (rojo)' },
  { score: 10, isGold: false, radius: 10, strokeWidth: 20, color: '#f59e0b', label: 'Diez puntos (oro)' },
];

export const TargetFace: React.FC<TargetFaceProps> = ({
  onScore,
  onMiss,
  disabled = false
}) => {
  const [hoveredRing, setHoveredRing] = useState<number | null>(null);
  const [clickedRing, setClickedRing] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleScore = useCallback((score: number, isGold: boolean, index: number) => {
    if (!disabled) {
      setClickedRing(index);
      onScore(score, isGold);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => setClickedRing(null), 150);
    }
  }, [disabled, onScore]);

  const handleMiss = useCallback(() => {
    if (!disabled) {
      onMiss();
    }
  }, [disabled, onMiss]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, score: number, isGold: boolean, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleScore(score, isGold, index);
    }
  }, [handleScore]);

  const getRingOpacity = (index: number) => {
    if (disabled) return 0.5;
    if (clickedRing === index) return 0.7;
    if (hoveredRing === index) return 0.85;
    return 1;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        viewBox="0 0 400 400"
        className="w-full max-w-[320px] aspect-square touch-none select-none"
        role="img"
        aria-label="Diana de tiro con arco"
      >
        {/* Drop shadow filter */}
        <defs>
          <filter id="ring-shadow">
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="3"
              floodColor="#000"
              floodOpacity="0.3"
            />
          </filter>
        </defs>

        {/* Background circle for the target */}
        <circle
          cx="200"
          cy="200"
          r="200"
          fill="#1e293b"
          opacity={disabled ? 0.5 : 1}
        />

        {/* Render rings from outside in */}
        {RINGS.map((ring, index) => (
          <circle
            key={`ring-${index}`}
            cx="200"
            cy="200"
            r={ring.radius}
            fill="none"
            stroke={ring.color}
            strokeWidth={ring.strokeWidth}
            opacity={getRingOpacity(index)}
            className={`transition-all duration-100 ${
              !disabled ? 'cursor-pointer hover:opacity-90' : 'cursor-not-allowed'
            }`}
            style={{
              filter: 'url(#ring-shadow)'
            }}
            onClick={() => handleScore(ring.score, ring.isGold, index)}
            onMouseEnter={() => !disabled && setHoveredRing(index)}
            onMouseLeave={() => setHoveredRing(null)}
            onTouchStart={() => !disabled && setHoveredRing(index)}
            onTouchEnd={() => setHoveredRing(null)}
            onKeyDown={(e) => handleKeyDown(e, ring.score, ring.isGold, index)}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={ring.label}
          />
        ))}

        {/* X marker in the center - separate from rings array */}
        <g
          opacity={disabled ? 0.5 : 1}
          className={`${!disabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}
          onClick={() => {
            if (!disabled) {
              setClickedRing(-1); // Special index for X
              onScore(10, true);
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
              timeoutRef.current = setTimeout(() => setClickedRing(null), 150);
            }
          }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
              e.preventDefault();
              setClickedRing(-1);
              onScore(10, true);
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
              timeoutRef.current = setTimeout(() => setClickedRing(null), 150);
            }
          }}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Diez de oro (X)"
        >
          <text
            x="200"
            y="210"
            textAnchor="middle"
            className="fill-current font-bold select-none"
            style={{
              fill: '#f59e0b',
              fontSize: '24px',
              fontFamily: 'system-ui, sans-serif'
            }}
          >
            X
          </text>
        </g>

        {/* Hover label */}
        {hoveredRing !== null && !disabled && (
          <text
            x="200"
            y="380"
            textAnchor="middle"
            className="fill-current text-sm font-medium"
            style={{ fill: '#9ca3af' }}
          >
            {RINGS[hoveredRing].label}
          </text>
        )}
      </svg>

      <button
        type="button"
        onClick={handleMiss}
        disabled={disabled}
        className="btn-miss touch-target w-full max-w-[200px]"
        aria-label="Fallo (0 puntos)"
      >
        <span className="text-lg font-bold">Miss</span>
        <span className="text-xs opacity-75">0 pts</span>
      </button>
    </div>
  );
};
