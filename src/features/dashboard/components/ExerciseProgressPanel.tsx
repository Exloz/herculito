import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CalendarRange,
  History,
  Minus,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { DashboardExerciseProgressSummary, Routine, WorkoutSession } from '../../../shared/types';
import { formatDateForDisplay, getDateStringInAppTimeZone } from '../../../shared/lib/dateUtils';
import { APP_LOCALE, formatCountLabel, formatDateValue, formatNumber } from '../../../shared/lib/intl';
import { buildExerciseProgress } from '../lib/workoutProgress';
import { useExerciseNameMap } from '../hooks/useExerciseNameMap';

interface ExerciseProgressPanelProps {
  sessions?: WorkoutSession[];
  routines?: Routine[];
  summaries?: DashboardExerciseProgressSummary[];
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_OPTIONS = [
  { value: 7, label: '7d', description: 'Semana' },
  { value: 30, label: '30d', description: 'Mes' },
  { value: 90, label: '90d', description: 'Trimestre' },
  { value: 'all', label: 'Todo', description: 'Completo' }
] as const;

type RangeValue = (typeof RANGE_OPTIONS)[number]['value'];

const CHART_HEIGHT = 220;
const CHART_PADDING = { top: 18, right: 16, bottom: 34, left: 46 };

const formatKg = (value: number): string => {
  return `${formatNumber(value, { maximumFractionDigits: 1 })} kg`;
};

const formatWeightValue = (value: number): string => {
  const hasDecimals = Math.abs(value % 1) > 0.001;
  return formatNumber(value, { maximumFractionDigits: hasDecimals ? 1 : 0 });
};

const formatSessionCount = (count: number): string => {
  return formatCountLabel(count, 'sesión', 'sesiones');
};

const formatSetCount = (count: number): string => {
  return formatCountLabel(count, 'serie', 'series');
};

const formatPointDate = (timestamp: number): string => {
  return formatDateForDisplay(getDateStringInAppTimeZone(new Date(timestamp)));
};

const formatAxisDate = (timestamp: number): string => {
  return formatDateValue(new Date(timestamp), {
    day: 'numeric',
    month: 'short'
  }, APP_LOCALE);
};

const formatDelta = (delta: number): string => {
  if (Math.abs(delta) < 0.05) return '0 kg';
  return `${delta > 0 ? '+' : ''}${formatWeightValue(delta)} kg`;
};

const getRangeLabel = (value: RangeValue): string => {
  const option = RANGE_OPTIONS.find((item) => item.value === value);
  return option?.label ?? 'Todo';
};

const getRangeTitle = (value: RangeValue): string => {
  if (value === 'all') {
    return 'Historial completo';
  }

  return `Últimos ${value} días`;
};

const getRangeCutoff = (value: RangeValue): number => {
  if (value === 'all') return Number.NEGATIVE_INFINITY;
  return Date.now() - (value * ONE_DAY_MS);
};

const getTrendCopy = (trend: DashboardExerciseProgressSummary['trend']) => {
  switch (trend) {
    case 'up':
      return {
        label: 'Subiendo',
        tone: 'text-mint border-mint/30 bg-mint/12',
        Icon: TrendingUp
      };
    case 'down':
      return {
        label: 'Bajando',
        tone: 'text-crimson border-crimson/30 bg-crimson/12',
        Icon: TrendingDown
      };
    case 'flat':
      return {
        label: 'Estable',
        tone: 'text-slate-200 border-mist/70 bg-white/5',
        Icon: Minus
      };
    default:
      return {
        label: 'Sin referencia',
        tone: 'text-slate-300 border-mist/60 bg-white/5',
        Icon: Activity
      };
  }
};

export const ExerciseProgressPanel: React.FC<ExerciseProgressPanelProps> = ({
  sessions = [],
  routines = [],
  summaries: precomputedSummaries
}) => {
  const exerciseNameMap = useExerciseNameMap(!precomputedSummaries);
  const summaries = useMemo(() => {
    if (precomputedSummaries) {
      return precomputedSummaries;
    }

    return buildExerciseProgress(sessions, routines, exerciseNameMap);
  }, [exerciseNameMap, precomputedSummaries, routines, sessions]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [selectedRangeDays, setSelectedRangeDays] = useState<RangeValue>('all');
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  useEffect(() => {
    if (summaries.length === 0) {
      if (selectedExerciseId !== '') {
        setSelectedExerciseId('');
      }
      return;
    }

    const selectedExists = summaries.some((summary) => summary.exerciseId === selectedExerciseId);
    if (!selectedExists) {
      setSelectedExerciseId(summaries[0].exerciseId);
    }
  }, [selectedExerciseId, summaries]);

  useEffect(() => {
    if (selectedRangeDays === 'all') {
      setIsHistoryExpanded(false);
    }
  }, [selectedExerciseId, selectedRangeDays]);

  const selectedSummary = useMemo(() => {
    if (summaries.length === 0) return null;
    return summaries.find((summary) => summary.exerciseId === selectedExerciseId) ?? summaries[0];
  }, [selectedExerciseId, summaries]);

  const pointsInRange = useMemo(() => {
    if (!selectedSummary) return [];
    const rangeCutoff = getRangeCutoff(selectedRangeDays);
    return selectedSummary.points.filter((point) => point.timestamp >= rangeCutoff);
  }, [selectedRangeDays, selectedSummary]);

  const latestPoint = pointsInRange.length > 0 ? pointsInRange[pointsInRange.length - 1] : null;
  const previousOverallWeight = selectedSummary?.previousWeight ?? null;
  const previousPoint = pointsInRange.length > 1
    ? pointsInRange[pointsInRange.length - 2]
    : selectedRangeDays === 'all' && previousOverallWeight !== null
      ? { bestWeight: previousOverallWeight }
      : null;
  const rangeTrend = previousPoint && latestPoint
    ? latestPoint.bestWeight > previousPoint.bestWeight
      ? 'up'
      : latestPoint.bestWeight < previousPoint.bestWeight
        ? 'down'
        : 'flat'
    : 'neutral';
  const displayedLastWeight = latestPoint?.bestWeight ?? selectedSummary?.lastWeight ?? 0;
  const displayedComparisonWeight = previousPoint?.bestWeight ?? null;
  const visibleStartWeight = pointsInRange.length > 0 ? pointsInRange[0].bestWeight : null;
  const rangeDelta = visibleStartWeight !== null && latestPoint
    ? latestPoint.bestWeight - visibleStartWeight
    : null;
  const historyItems = useMemo(() => {
    return pointsInRange
      .map((point, index) => {
        const previousInView = index > 0 ? pointsInRange[index - 1] : null;

        return {
          ...point,
          deltaFromPrevious: previousInView ? point.bestWeight - previousInView.bestWeight : null,
          dateLabel: formatPointDate(point.timestamp)
        };
      })
      .reverse();
  }, [pointsInRange]);
  const isHistoryCollapsible = selectedRangeDays === 'all' && historyItems.length > 3;
  const visibleHistoryItems = isHistoryCollapsible && !isHistoryExpanded
    ? historyItems.slice(0, 3)
    : historyItems;
  const trendCopy = getTrendCopy(rangeTrend);
  const chartData = useMemo(() => {
    if (pointsInRange.length === 0) {
      return null;
    }

    const weights = pointsInRange.map((point) => point.bestWeight);
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const spread = Math.max(maxWeight - minWeight, maxWeight > 0 ? maxWeight * 0.12 : 1);
    const domainPadding = Math.max(spread * 0.18, 2);
    const domainMin = Math.max(0, minWeight - domainPadding);
    const domainMax = maxWeight + domainPadding;
    const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
    const plotWidth = Math.max(220, pointsInRange.length === 1 ? 220 : (pointsInRange.length - 1) * 42);
    const width = CHART_PADDING.left + CHART_PADDING.right + plotWidth;
    const yRange = Math.max(domainMax - domainMin, 1);

    const coordinates = pointsInRange.map((point, index) => {
      const x = pointsInRange.length === 1
        ? CHART_PADDING.left + (plotWidth / 2)
        : CHART_PADDING.left + ((index / (pointsInRange.length - 1)) * plotWidth);
      const y = CHART_PADDING.top + (((domainMax - point.bestWeight) / yRange) * plotHeight);

      return {
        ...point,
        x,
        y,
        axisDate: formatAxisDate(point.timestamp),
        pointDate: formatPointDate(point.timestamp)
      };
    });

    const linePath = coordinates
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
    const bottomY = CHART_PADDING.top + plotHeight;
    const areaPath = coordinates.length > 1
      ? `${linePath} L ${coordinates[coordinates.length - 1].x} ${bottomY} L ${coordinates[0].x} ${bottomY} Z`
      : '';
    const ticks = Array.from({ length: 4 }, (_, index) => {
      const ratio = index / 3;
      return {
        y: CHART_PADDING.top + (ratio * plotHeight),
        value: domainMax - (ratio * yRange)
      };
    });
    const labelStep = coordinates.length > 10 ? Math.ceil(coordinates.length / 6) : 1;

    return {
      width,
      bottomY,
      ticks,
      linePath,
      areaPath,
      coordinates,
      labelStep,
      minWeight,
      maxWeight
    };
  }, [pointsInRange]);

  return (
    <div className="overflow-hidden rounded-[1.75rem] bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_24%),linear-gradient(180deg,rgba(22,28,38,0.98),rgba(11,15,20,0.98))] p-4 shadow-lift sm:p-5">
      {selectedSummary ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-amberGlow/85">
                <Activity className="text-mint" size={14} />
                <span>Historial y progreso</span>
              </div>
              <div className="mt-2 font-display text-[1.6rem] uppercase leading-none text-white sm:text-[2rem]">
                {selectedSummary.exerciseName}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                <span className="rounded-full bg-white/[0.05] px-2.5 py-1">{formatSessionCount(selectedSummary.totalSessions)}</span>
                <span className="rounded-full bg-white/[0.05] px-2.5 py-1">Último: {formatPointDate(selectedSummary.lastCompletedAt.getTime())}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${trendCopy.tone}`}>
                  <trendCopy.Icon size={13} />
                  {trendCopy.label}
                </span>
              </div>
            </div>

            <div className="xl:min-w-[18rem] xl:max-w-[20rem] xl:flex-1">
              <label className="block min-w-0" htmlFor="exercise-progress-selector">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Ejercicio</span>
                <select
                  id="exercise-progress-selector"
                  className="input input-sm"
                  value={selectedSummary.exerciseId}
                  onChange={(event) => setSelectedExerciseId(event.target.value)}
                >
                  {summaries.map((summary) => (
                    <option key={summary.exerciseId} value={summary.exerciseId}>
                      {summary.exerciseName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-slate-400">
              <span>Rango</span>
              <span>{formatSessionCount(pointsInRange.length)} visibles</span>
            </div>
            <div className="grid grid-cols-4 gap-1 rounded-[1rem] bg-slateDeep/70 p-1" role="group" aria-label="Rango de progresion">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => {
                    setSelectedRangeDays(option.value);
                    if (option.value !== 'all') {
                      setIsHistoryExpanded(true);
                    } else {
                      setIsHistoryExpanded(false);
                    }
                  }}
                  className={`touch-target-sm rounded-[0.85rem] px-2 py-2 text-center transition-colors ${selectedRangeDays === option.value
                    ? 'bg-mint/18 text-mint'
                    : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  aria-pressed={selectedRangeDays === option.value}
                >
                  <span className="block text-xs font-semibold">{option.label}</span>
                  <span className="mt-0.5 block text-[10px] uppercase tracking-[0.14em] text-current/70">{option.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-[1rem] bg-white/[0.04] px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Último</div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="font-display text-lg text-white sm:text-xl">{formatKg(displayedLastWeight)}</div>
                {rangeTrend === 'up' && <TrendingUp size={14} className="text-mint" />}
                {rangeTrend === 'down' && <TrendingDown size={14} className="text-crimson" />}
                {rangeTrend === 'flat' && <Minus size={14} className="text-slate-300" />}
              </div>
              <div className="mt-1 text-[11px] leading-tight text-slate-400">
                {displayedComparisonWeight !== null ? `${formatDelta(displayedLastWeight - displayedComparisonWeight)} vs anterior` : 'Sin comparación previa'}
              </div>
            </div>

            <div className="rounded-[1rem] bg-mint/10 px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-mint/75">Récord</div>
              <div className="mt-1.5 font-display text-lg text-white sm:text-xl">{formatKg(selectedSummary.personalRecord)}</div>
              <div className="mt-1 text-[11px] leading-tight text-slate-300">Mejor marca total</div>
            </div>

            <div className="rounded-[1rem] bg-white/[0.04] px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Cambio</div>
              <div className={`mt-1.5 font-display text-lg sm:text-xl ${rangeDelta === null || Math.abs(rangeDelta) < 0.05 ? 'text-slate-100' : rangeDelta > 0 ? 'text-mint' : 'text-crimson'}`}>
                {rangeDelta !== null ? formatDelta(rangeDelta) : 'Sin datos'}
              </div>
              <div className="mt-1 text-[11px] leading-tight text-slate-400">Desde el inicio</div>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)]">
            <div className="min-w-0 rounded-[1.2rem] bg-slateDeep/55 p-3.5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    <BarChart3 size={13} className="text-mint" />
                    <span>Mapa de carga</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white">{getRangeTitle(selectedRangeDays)}</div>
                </div>

                <div className="rounded-[0.9rem] bg-white/[0.05] px-2.5 py-2 text-right text-xs text-slate-400">
                  <div className="flex items-center justify-end gap-1">
                    <CalendarRange size={12} />
                    <span>{getRangeLabel(selectedRangeDays)}</span>
                  </div>
                </div>
              </div>

              {chartData ? (
                <div className="overflow-x-auto pb-1" role="img" aria-label="Gráfica de progresión de carga con escala en kilogramos">
                  <svg
                    width={chartData.width}
                    height={CHART_HEIGHT}
                    viewBox={`0 0 ${chartData.width} ${CHART_HEIGHT}`}
                    className="min-w-full"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="exercise-progress-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(72, 229, 163, 0.34)" />
                        <stop offset="100%" stopColor="rgba(72, 229, 163, 0.02)" />
                      </linearGradient>
                      <linearGradient id="exercise-progress-line" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="rgba(245, 158, 11, 0.9)" />
                        <stop offset="100%" stopColor="rgba(72, 229, 163, 0.95)" />
                      </linearGradient>
                    </defs>

                    {chartData.ticks.map((tick) => (
                      <g key={tick.y}>
                        <line
                          x1={CHART_PADDING.left}
                          x2={chartData.width - CHART_PADDING.right}
                          y1={tick.y}
                          y2={tick.y}
                          stroke="rgba(148, 163, 184, 0.14)"
                          strokeDasharray="3 4"
                        />
                        <text
                          x={CHART_PADDING.left - 8}
                          y={tick.y + 4}
                          textAnchor="end"
                          fill="rgba(148, 163, 184, 0.82)"
                          fontSize="10"
                        >
                          {formatWeightValue(tick.value)}
                        </text>
                      </g>
                    ))}

                    {chartData.coordinates.map((point) => (
                      <line
                        key={`guide-${point.timestamp}`}
                        x1={point.x}
                        x2={point.x}
                        y1={point.y}
                        y2={chartData.bottomY}
                        stroke="rgba(72, 229, 163, 0.12)"
                      />
                    ))}

                    {chartData.areaPath ? <path d={chartData.areaPath} fill="url(#exercise-progress-area)" /> : null}
                    {chartData.coordinates.length > 1 ? (
                      <path
                        d={chartData.linePath}
                        fill="none"
                        stroke="url(#exercise-progress-line)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : null}

                    {chartData.coordinates.map((point, index) => {
                      const isLatest = index === chartData.coordinates.length - 1;

                      return (
                        <g key={`point-${point.timestamp}`}>
                          <title>{`${point.pointDate}: ${formatKg(point.bestWeight)}`}</title>
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r={isLatest ? 6 : 4.5}
                            fill={isLatest ? '#f59e0b' : '#48e5a3'}
                            stroke="rgba(11, 15, 20, 0.95)"
                            strokeWidth="2"
                          />
                          {(index % chartData.labelStep === 0 || isLatest) ? (
                            <text
                              x={point.x}
                              y={CHART_HEIGHT - 12}
                              textAnchor="middle"
                              fill="rgba(203, 213, 225, 0.82)"
                              fontSize="10"
                            >
                              {point.axisDate}
                            </text>
                          ) : null}
                        </g>
                      );
                    })}
                  </svg>
                  <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-400">
                    <span>Escala: {formatKg(chartData.minWeight)} - {formatKg(chartData.maxWeight)}</span>
                    <span>{formatSessionCount(pointsInRange.length)}</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-[1rem] bg-white/[0.05] px-4 py-8 text-center text-xs text-slate-400">
                  No hay sesiones con carga en este rango. Cambia a <button type="button" className="font-semibold text-mint" onClick={() => setSelectedRangeDays('all')}>Todo</button> para ver el historial completo.
                </div>
              )}
            </div>

            <div className="min-w-0 rounded-[1.2rem] bg-slateDeep/55 p-3.5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    <History size={13} className="text-amberGlow" />
                    <span>Historial</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white">{getRangeTitle(selectedRangeDays)}</div>
                </div>
                <div className="text-xs text-slate-400">{pointsInRange.length} entradas</div>
              </div>

              {historyItems.length > 0 ? (
                <div>
                  {isHistoryCollapsible && (
                    <button
                      type="button"
                      className="mb-3 flex w-full items-center justify-between rounded-[0.95rem] border border-white/8 bg-white/[0.03] px-3 py-2 text-left transition-colors hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slateDeep"
                      onClick={() => setIsHistoryExpanded((current) => !current)}
                      aria-expanded={isHistoryExpanded}
                      aria-controls="exercise-history-list"
                    >
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Vista</div>
                        <div className="mt-0.5 text-sm font-medium text-white">
                          {isHistoryExpanded ? 'Ocultar historial completo' : 'Ver historial completo'}
                        </div>
                      </div>
                      <div className="text-xs text-slate-400">
                        {isHistoryExpanded ? 'Mostrando todo' : 'Solo recientes'}
                      </div>
                    </button>
                  )}

                  <div
                    id="exercise-history-list"
                    className={`space-y-1.5 pr-1 ${isHistoryExpanded || !isHistoryCollapsible ? 'max-h-[20rem] overflow-y-auto' : ''}`}
                  >
                    {visibleHistoryItems.map((point) => {
                      const deltaTone = point.deltaFromPrevious === null || Math.abs(point.deltaFromPrevious) < 0.05
                        ? 'text-slate-300 bg-white/[0.06]'
                        : point.deltaFromPrevious > 0
                          ? 'text-mint bg-mint/10'
                          : 'text-crimson bg-crimson/10';

                      const deltaLabel = point.deltaFromPrevious === null
                        ? 'Inicio'
                        : Math.abs(point.deltaFromPrevious) < 0.05
                          ? 'Sin cambio'
                          : formatDelta(point.deltaFromPrevious);

                      return (
                        <div key={point.timestamp} className="rounded-[0.95rem] bg-white/[0.04] px-3 py-2.5">
                          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-white">{point.dateLabel}</div>
                              <div className="mt-1 text-[11px] text-slate-400">
                                {formatSetCount(point.completedSets)} completadas · Volumen {formatKg(point.totalWeight)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-display text-base text-white sm:text-lg">{formatKg(point.bestWeight)}</div>
                              <div className={`mt-1 rounded-full px-2 py-1 text-[10px] font-semibold ${deltaTone}`}>
                                {deltaLabel}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-[1rem] bg-white/[0.05] px-4 py-8 text-center text-xs text-slate-400">
                  No hay registros en {getRangeTitle(selectedRangeDays).toLowerCase()}.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[1.2rem] bg-white/[0.04] px-4 py-10 text-center">
          <div className="font-display text-xl uppercase text-white">Sin progreso visible todavía</div>
          <p className="mt-2 text-sm text-slate-400">Completa algunas sesiones con peso para desbloquear el historial por ejercicio.</p>
        </div>
      )}
    </div>
  );
};
