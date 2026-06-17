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
  { score: 3, outerRadius: 160, fill: 'url(#target-black)', hoverFill: 'url(#target-black-hover)', label: '3 puntos' },
  { score: 4, outerRadius: 140, fill: 'url(#target-black)', hoverFill: 'url(#target-black-hover)', label: '4 puntos' },
  { score: 5, outerRadius: 120, fill: 'url(#target-blue)', hoverFill: 'url(#target-blue-hover)', label: '5 puntos' },
  { score: 6, outerRadius: 100, fill: 'url(#target-blue)', hoverFill: 'url(#target-blue-hover)', label: '6 puntos' },
  { score: 7, outerRadius: 80, fill: 'url(#target-red)', hoverFill: 'url(#target-red-hover)', label: '7 puntos' },
  { score: 8, outerRadius: 60, fill: 'url(#target-red)', hoverFill: 'url(#target-red-hover)', label: '8 puntos' },
  { score: 9, outerRadius: 40, fill: 'url(#target-gold)', hoverFill: 'url(#target-gold-hover)', label: '9 puntos' },
  { score: 10, outerRadius: 20, fill: 'url(#target-gold)', hoverFill: 'url(#target-gold-hover)', label: '10 puntos' },
];

const RING_GUIDES = [20, 40, 60, 80, 100, 120, 140, 160, 180];

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
  const isAimingRef = useRef(false);
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

  const registerSelection = useCallback((zone: ZoneInfo | null, shouldRegisterMiss = false) => {
    if (disabled) {
      return;
    }

    if (!zone && !shouldRegisterMiss) {
      setHoveredZone(null);
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

  const updateAimingPreview = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    const distance = getPointFromEvent(event, event.currentTarget);
    const zone = getZoneFromDistance(distance);
    setHoveredZone(zone);
    return zone;
  }, [getPointFromEvent]);

  const handlePointerDown = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (disabled) {
      return;
    }

    event.preventDefault();
    isAimingRef.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateAimingPreview(event);
  }, [disabled, updateAimingPreview]);

  const handlePointerMove = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (disabled) {
      return;
    }

    updateAimingPreview(event);
  }, [disabled, updateAimingPreview]);

  const handlePointerUp = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (disabled || !isAimingRef.current) {
      return;
    }

    event.preventDefault();
    isAimingRef.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const zone = updateAimingPreview(event);
    registerSelection(zone);
  }, [disabled, registerSelection, updateAimingPreview]);

  const handlePointerCancel = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    isAimingRef.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setHoveredZone(null);
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (!isAimingRef.current) {
      setHoveredZone(null);
    }
  }, []);

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
    <div className="target-face-compact">
      <svg
        viewBox="0 0 400 400"
        className={`target-face-svg ${hitPulse ? 'target-ring-hit' : ''}`}
        role="img"
        aria-label="Diana de tiro con arco - Toca donde impactaste"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerLeave}
      >
          <defs>
            <radialGradient id="target-gold" cx="34%" cy="34%" r="78%">
              <stop offset="0%" stopColor="#fff6a8" />
              <stop offset="48%" stopColor="#fcd116" />
              <stop offset="100%" stopColor="#e7a900" />
            </radialGradient>
            <radialGradient id="target-gold-hover" cx="34%" cy="34%" r="78%">
              <stop offset="0%" stopColor="#fff9bf" />
              <stop offset="48%" stopColor="#ffd84d" />
              <stop offset="100%" stopColor="#f4b400" />
            </radialGradient>
            <radialGradient id="target-red" cx="34%" cy="34%" r="78%">
              <stop offset="0%" stopColor="#ff746f" />
              <stop offset="58%" stopColor="#e31b23" />
              <stop offset="100%" stopColor="#b9151c" />
            </radialGradient>
            <radialGradient id="target-red-hover" cx="34%" cy="34%" r="78%">
              <stop offset="0%" stopColor="#ff9a96" />
              <stop offset="58%" stopColor="#f03a3f" />
              <stop offset="100%" stopColor="#c91920" />
            </radialGradient>
            <radialGradient id="target-blue" cx="34%" cy="34%" r="78%">
              <stop offset="0%" stopColor="#6fd0ff" />
              <stop offset="55%" stopColor="#0072ce" />
              <stop offset="100%" stopColor="#004f9e" />
            </radialGradient>
            <radialGradient id="target-blue-hover" cx="34%" cy="34%" r="78%">
              <stop offset="0%" stopColor="#9ee1ff" />
              <stop offset="55%" stopColor="#1491e6" />
              <stop offset="100%" stopColor="#0063bd" />
            </radialGradient>
            <radialGradient id="target-black" cx="34%" cy="34%" r="78%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="60%" stopColor="#202632" />
              <stop offset="100%" stopColor="#0b101a" />
            </radialGradient>
            <radialGradient id="target-black-hover" cx="34%" cy="34%" r="78%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="60%" stopColor="#303847" />
              <stop offset="100%" stopColor="#111827" />
            </radialGradient>
            <radialGradient id="target-white" cx="34%" cy="34%" r="78%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="58%" stopColor="#f3f4f6" />
              <stop offset="100%" stopColor="#d8dde5" />
            </radialGradient>
            <radialGradient id="target-white-hover" cx="34%" cy="34%" r="78%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="58%" stopColor="#fafafa" />
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

            {RING_GUIDES.map((radius) => (
              <g key={radius}>
                <circle
                  cx="200"
                  cy="200"
                  r={radius}
                  fill="none"
                  stroke="rgba(2,6,23,0.5)"
                  strokeWidth="2.2"
                />
                <circle
                  cx="200"
                  cy="200"
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.38)"
                  strokeWidth="0.9"
                />
              </g>
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

      <div className={`target-score-compact ${previewZone?.isGold ? 'gold' : ''} ${selectedZone ? 'flash' : ''}`}>
        <span className="target-score-value">{previewZone ? previewZone.label : '-'}</span>
        <span className="target-score-helper">{previewZone ? previewZone.helper : 'Toca la diana'}</span>
      </div>

      <div className="target-actions-compact">
        <button
          type="button"
          onClick={() => registerSelection(null, true)}
          disabled={disabled}
          className="target-btn-miss"
          aria-label="Fallo (0 puntos)"
        >
          Miss
        </button>
        <button
          type="button"
          onClick={() => handleQuickKey(10, true)}
          disabled={disabled}
          className="target-btn-x"
          aria-label="Diez de oro (X)"
        >
          X
        </button>
      </div>
    </div>
  );
};
