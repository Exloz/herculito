import React, { useState, useEffect, useRef, useCallback } from 'react';

interface TargetFaceProps {
  onScore: (score: number, isGold: boolean) => void;
  onMiss: () => void;
  disabled?: boolean;
}

interface RingInfo {
  score: number;
  outerRadius: number;
  fill: string;
  hoverFill: string;
  label: string;
}

interface ZoneInfo {
  key: string;
  score: number;
  isGold: boolean;
  label: string;
  helper: string;
}

const TARGET_SIZE = 400;
const TARGET_CENTER = TARGET_SIZE / 2;
const TARGET_RADIUS = 200;
const TEN_RADIUS = 20;
const X_RADIUS = 9;

const RINGS: RingInfo[] = [
  { score: 1, outerRadius: 200, fill: 'url(#target-white)', hoverFill: 'url(#target-white-hover)', label: '1 punto' },
  { score: 2, outerRadius: 180, fill: 'url(#target-white)', hoverFill: 'url(#target-white-hover)', label: '2 puntos' },
  { score: 3, outerRadius: 160, fill: 'url(#target-white)', hoverFill: 'url(#target-white-hover)', label: '3 puntos' },
  { score: 4, outerRadius: 140, fill: 'url(#target-black)', hoverFill: 'url(#target-black-hover)', label: '4 puntos' },
  { score: 5, outerRadius: 120, fill: 'url(#target-black)', hoverFill: 'url(#target-black-hover)', label: '5 puntos' },
  { score: 6, outerRadius: 100, fill: 'url(#target-black)', hoverFill: 'url(#target-black-hover)', label: '6 puntos' },
  { score: 7, outerRadius: 80, fill: 'url(#target-blue)', hoverFill: 'url(#target-blue-hover)', label: '7 puntos' },
  { score: 8, outerRadius: 60, fill: 'url(#target-blue)', hoverFill: 'url(#target-blue-hover)', label: '8 puntos' },
  { score: 9, outerRadius: 40, fill: 'url(#target-red)', hoverFill: 'url(#target-red-hover)', label: '9 puntos' },
  { score: 10, outerRadius: 20, fill: 'url(#target-gold)', hoverFill: 'url(#target-gold-hover)', label: '10 puntos' },
];

const getZoneFromDistance = (distance: number): ZoneInfo | null => {
  if (distance > TARGET_RADIUS) {
    return null;
  }

  if (distance <= X_RADIUS) {
    return {
      key: 'x',
      score: 10,
      isGold: true,
      label: 'X',
      helper: 'Centro perfecto',
    };
  }

  if (distance <= TEN_RADIUS) {
    return {
      key: '10',
      score: 10,
      isGold: false,
      label: '10',
      helper: 'Anillo dorado',
    };
  }

  const zone = [...RINGS].reverse().find((ring) => distance <= ring.outerRadius);
  if (!zone) {
    return null;
  }

  return {
    key: String(zone.score),
    score: zone.score,
    isGold: false,
    label: String(zone.score),
    helper: zone.label,
  };
};

const getZoneStroke = (zone: ZoneInfo | null) => {
  if (!zone) {
    return null;
  }

  if (zone.key === 'x') {
    return {
      radius: X_RADIUS,
      width: 8,
      stroke: '#fde68a',
    };
  }

  const ring = RINGS.find((item) => String(item.score) === zone.key);
  if (!ring) {
    return null;
  }

  const innerRadius = ring.score === 10
    ? X_RADIUS
    : ring.outerRadius - 20;

  return {
    radius: (ring.outerRadius + innerRadius) / 2,
    width: ring.outerRadius - innerRadius,
    stroke: zone.score >= 9 ? '#fde68a' : '#ffffff',
  };
};

export const TargetFace: React.FC<TargetFaceProps> = ({
  onScore,
  onMiss,
  disabled = false,
}) => {
  const [hoveredZone, setHoveredZone] = useState<ZoneInfo | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneInfo | null>(null);
  const [hitPulse, setHitPulse] = useState(false);
  const hitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hitTimeoutRef.current) {
        clearTimeout(hitTimeoutRef.current);
      }

      if (selectedTimeoutRef.current) {
        clearTimeout(selectedTimeoutRef.current);
      }
    };
  }, []);

  const getPointFromEvent = useCallback((event: { clientX: number; clientY: number }, svg: SVGSVGElement) => {
    const rect = svg.getBoundingClientRect();
    const scale = TARGET_SIZE / rect.width;
    const x = (event.clientX - rect.left) * scale;
    const y = (event.clientY - rect.top) * scale;
    const dx = x - TARGET_CENTER;
    const dy = y - TARGET_CENTER;

    return Math.sqrt((dx * dx) + (dy * dy));
  }, []);

  const registerSelection = useCallback((zone: ZoneInfo | null) => {
    if (disabled) {
      return;
    }

    if (hitTimeoutRef.current) {
      clearTimeout(hitTimeoutRef.current);
    }

    if (selectedTimeoutRef.current) {
      clearTimeout(selectedTimeoutRef.current);
    }

    setHitPulse(true);

    if (!zone) {
      setSelectedZone({
        key: 'miss',
        score: 0,
        isGold: false,
        label: 'M',
        helper: 'Miss',
      });
      onMiss();
    } else {
      setSelectedZone(zone);
      onScore(zone.score, zone.isGold);
    }

    hitTimeoutRef.current = setTimeout(() => {
      setHitPulse(false);
    }, 180);

    selectedTimeoutRef.current = setTimeout(() => {
      setSelectedZone(null);
    }, 1100);
  }, [disabled, onMiss, onScore]);

  const handlePointerMove = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (disabled) {
      return;
    }

    const distance = getPointFromEvent(event, event.currentTarget);
    setHoveredZone(getZoneFromDistance(distance));
  }, [disabled, getPointFromEvent]);

  const handlePointerLeave = useCallback(() => {
    setHoveredZone(null);
  }, []);

  const handleTargetClick = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (disabled) {
      return;
    }

    const distance = getPointFromEvent(event, event.currentTarget);
    registerSelection(getZoneFromDistance(distance));
  }, [disabled, getPointFromEvent, registerSelection]);

  const handleQuickKey = useCallback((score: number, isGold: boolean) => {
    registerSelection({
      key: isGold ? 'x' : String(score),
      score,
      isGold,
      label: isGold ? 'X' : String(score),
      helper: isGold ? 'Centro perfecto' : `${score} puntos`,
    });
  }, [registerSelection]);

  const previewZone = selectedZone ?? hoveredZone;
  const previewStroke = getZoneStroke(previewZone && previewZone.key !== 'miss' ? previewZone : null);

  return (
    <div className="target-face-container">
      <div className="target-face-stage">
        <div className="target-face-meta">
          <div>
            <p className="target-face-eyebrow">Modo diana</p>
            <p className="target-face-title">Toca el anillo real donde impactaste</p>
          </div>
          <div className="target-face-tip">
            <span className="target-face-tip-dot" />
            Centro = X, dorado exterior = 10
          </div>
        </div>

        <svg
          viewBox="0 0 400 400"
          className={`target-face-svg ${hitPulse ? 'target-ring-hit' : ''}`}
          role="img"
          aria-label="Diana de tiro con arco"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onClick={handleTargetClick}
        >
          <defs>
            <radialGradient id="target-gold" cx="35%" cy="35%" r="75%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="55%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </radialGradient>
            <radialGradient id="target-gold-hover" cx="35%" cy="35%" r="75%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="55%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </radialGradient>
            <radialGradient id="target-red" cx="35%" cy="35%" r="75%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="100%" stopColor="#dc2626" />
            </radialGradient>
            <radialGradient id="target-red-hover" cx="35%" cy="35%" r="75%">
              <stop offset="0%" stopColor="#fecaca" />
              <stop offset="100%" stopColor="#ef4444" />
            </radialGradient>
            <radialGradient id="target-blue" cx="35%" cy="35%" r="75%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="100%" stopColor="#2563eb" />
            </radialGradient>
            <radialGradient id="target-blue-hover" cx="35%" cy="35%" r="75%">
              <stop offset="0%" stopColor="#bfdbfe" />
              <stop offset="100%" stopColor="#3b82f6" />
            </radialGradient>
            <radialGradient id="target-black" cx="35%" cy="35%" r="75%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="100%" stopColor="#111827" />
            </radialGradient>
            <radialGradient id="target-black-hover" cx="35%" cy="35%" r="75%">
              <stop offset="0%" stopColor="#9ca3af" />
              <stop offset="100%" stopColor="#374151" />
            </radialGradient>
            <radialGradient id="target-white" cx="35%" cy="35%" r="75%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#d1d5db" />
            </radialGradient>
            <radialGradient id="target-white-hover" cx="35%" cy="35%" r="75%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e5e7eb" />
            </radialGradient>
            <filter id="target-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="12" stdDeviation="14" floodColor="#020617" floodOpacity="0.5" />
            </filter>
            <filter id="x-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#fbbf24" floodOpacity="0.45" />
            </filter>
          </defs>

          <circle
            cx="200"
            cy="200"
            r="208"
            fill="#020617"
            opacity={disabled ? 0.45 : 1}
          />

          <g filter="url(#target-shadow)" opacity={disabled ? 0.55 : 1} aria-hidden="true">
            {RINGS.map((ring) => {
              const isHovered = hoveredZone?.key === String(ring.score);

              return (
                <circle
                  key={ring.score}
                  cx="200"
                  cy="200"
                  r={ring.outerRadius}
                  fill={isHovered ? ring.hoverFill : ring.fill}
                  className="target-ring-shape"
                />
              );
            })}

            <circle
              cx="200"
              cy="200"
              r={X_RADIUS}
              fill={hoveredZone?.key === 'x' ? '#fef3c7' : '#fde68a'}
              opacity="0.98"
              filter="url(#x-glow)"
            />

            <circle
              cx="200"
              cy="200"
              r="200"
              fill="none"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="2"
            />

            {[20, 40, 60, 80, 100, 120, 140, 160, 180].map((radius) => (
              <circle
                key={radius}
                cx="200"
                cy="200"
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.16)"
                strokeWidth="1"
              />
            ))}
          </g>

          {previewStroke && (
            <circle
              cx="200"
              cy="200"
              r={previewStroke.radius}
              fill="none"
              stroke={previewStroke.stroke}
              strokeWidth={previewStroke.width}
              opacity="0.32"
              className="target-hit-zone"
              pointerEvents="none"
            />
          )}

          <g pointerEvents="none" aria-hidden="true">
            <circle
              cx="200"
              cy="200"
              r={X_RADIUS + 2}
              fill="none"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth="1.5"
            />
            <text
              x="200"
              y="208"
              textAnchor="middle"
              className="target-center-x"
              style={{ filter: 'url(#x-glow)' }}
            >
              X
            </text>
          </g>
        </svg>

        <div className={`target-score-panel ${previewZone?.isGold ? 'gold' : ''} ${selectedZone ? 'score-select-flash' : ''}`}>
          <div className="target-score-display">
            <span className="target-score-value">
              {previewZone ? previewZone.label : '...'}
            </span>
            <span className="target-score-label">
              {previewZone ? previewZone.helper : 'Listo para puntuar'}
            </span>
          </div>
        </div>

        <div className="target-face-actions">
          <button
            type="button"
            onClick={() => registerSelection(null)}
            disabled={disabled}
            className="btn-miss-premium"
            aria-label="Fallo (0 puntos)"
          >
            <span className="text-base font-bold">Miss</span>
            <span className="text-xs opacity-70">Fuera de la diana</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickKey(10, true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleQuickKey(10, true);
              }
            }}
            disabled={disabled}
            className="target-x-shortcut"
            aria-label="Diez de oro (X)"
            tabIndex={disabled ? -1 : 0}
            role="button"
          >
            <span className="target-x-shortcut-mark">10/X</span>
            <span className="text-xs text-amberGlow/80">Centro exacto</span>
          </button>
        </div>

        {!disabled && (
          <p className="keyboard-hint text-center mt-2">
            Toca la diana, o usa `0-9`, `D` para 10, `X` y `M` para cargar rapido.
          </p>
        )}
      </div>
    </div>
  );
};
