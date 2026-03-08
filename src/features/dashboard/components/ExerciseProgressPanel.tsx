import React, { useEffect, useMemo, useState } from 'react';
import { Activity, TrendingDown, TrendingUp } from 'lucide-react';
import { DashboardExerciseProgressSummary, Routine, WorkoutSession } from '../../../shared/types';
import { formatDateForDisplay, getDateStringInAppTimeZone } from '../../../shared/lib/dateUtils';
import { buildExerciseProgress } from '../lib/workoutProgress';
import { useExerciseNameMap } from '../hooks/useExerciseNameMap';

interface ExerciseProgressPanelProps {
  sessions?: WorkoutSession[];
  routines?: Routine[];
  summaries?: DashboardExerciseProgressSummary[];
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_OPTIONS = [
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' }
] as const;

const formatKg = (value: number): string => {
  return `${value.toLocaleString('es-CO', { maximumFractionDigits: 1 })} kg`;
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
  const [selectedRangeDays, setSelectedRangeDays] = useState<number>(30);

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

  const selectedSummary = useMemo(() => {
    if (summaries.length === 0) return null;
    return summaries.find((summary) => summary.exerciseId === selectedExerciseId) ?? summaries[0];
  }, [selectedExerciseId, summaries]);

  const rangeCutoff = Date.now() - (selectedRangeDays * ONE_DAY_MS);
  const pointsInRange = selectedSummary
    ? selectedSummary.points.filter((point) => point.timestamp >= rangeCutoff)
    : [];
  const chartPoints = pointsInRange.slice(-8);
  const maxWeight = chartPoints.reduce((max, point) => Math.max(max, point.bestWeight), 0);
  const latestPoint = pointsInRange.length > 0 ? pointsInRange[pointsInRange.length - 1] : null;
  const previousPoint = pointsInRange.length > 1 ? pointsInRange[pointsInRange.length - 2] : null;
  const rangeTrend = previousPoint
    ? latestPoint && latestPoint.bestWeight > previousPoint.bestWeight
      ? 'up'
      : latestPoint && latestPoint.bestWeight < previousPoint.bestWeight
        ? 'down'
        : 'flat'
    : 'neutral';
  const displayedLastWeight = latestPoint?.bestWeight ?? selectedSummary?.lastWeight ?? 0;

  return (
    <div className="app-card p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="text-mint" size={18} />
        <h3 className="text-lg font-display text-white">Historico y progresion</h3>
      </div>

      {selectedSummary ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="exercise-progress-selector" className="text-xs text-slate-400 block mb-1.5">
              Ejercicio
            </label>
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
          </div>

          <div>
            <div className="text-xs text-slate-400 block mb-1.5">Rango</div>
            <div className="app-surface-muted p-1 rounded-xl flex gap-1" role="group" aria-label="Rango de progresion">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.days}
                  type="button"
                  onClick={() => setSelectedRangeDays(option.days)}
                  className={`flex-1 rounded-lg text-xs font-semibold transition-colors touch-target-sm ${selectedRangeDays === option.days
                    ? 'bg-mint/20 text-mint'
                    : 'text-slate-300 hover:bg-slateDeep hover:text-white'
                    }`}
                  aria-pressed={selectedRangeDays === option.days}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="app-surface-muted rounded-xl p-3">
              <div className="text-[11px] text-slate-400 uppercase tracking-wide">Ultima carga</div>
              <div className="mt-1 flex items-center gap-2">
                <div className="text-base sm:text-xl font-display text-white">{formatKg(displayedLastWeight)}</div>
                {rangeTrend === 'up' && <TrendingUp size={16} className="text-mint" />}
                {rangeTrend === 'down' && <TrendingDown size={16} className="text-crimson" />}
              </div>
            </div>

            <div className="app-surface-muted rounded-xl p-3">
              <div className="text-[11px] text-slate-400 uppercase tracking-wide">Record personal</div>
              <div className="mt-1 text-base sm:text-xl font-display text-amberGlow">{formatKg(selectedSummary.personalRecord)}</div>
            </div>

            <div className="app-surface-muted rounded-xl p-3">
              <div className="text-[11px] text-slate-400 uppercase tracking-wide">Volumen 7d</div>
              <div className="mt-1 text-base sm:text-xl font-display text-mint">{formatKg(selectedSummary.weeklyVolumeKg)}</div>
            </div>
          </div>

          <div className="app-surface-muted rounded-xl p-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Periodo {selectedRangeDays}d</span>
              <span>{pointsInRange.length} sesiones</span>
            </div>

            {chartPoints.length > 0 ? (
              <div className="h-24 flex items-end gap-1.5" role="img" aria-label="Grafica de progresion de carga">
                {chartPoints.map((point) => {
                  const normalized = maxWeight > 0 ? point.bestWeight / maxWeight : 0;
                  const height = Math.max(18, Math.round(normalized * 88));

                  return (
                    <div key={`${point.timestamp}-${point.bestWeight}-${point.completedSets}`} className="flex-1 min-w-0">
                      <div
                        className="w-full rounded-md bg-gradient-to-t from-mint/70 to-mint h-full"
                        style={{ height }}
                        title={`${formatDateForDisplay(getDateStringInAppTimeZone(new Date(point.timestamp)))}: ${formatKg(point.bestWeight)}`}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-6 text-center">
                No hay sesiones con carga en este rango.
              </div>
            )}
          </div>

          <div className="space-y-2">
            {pointsInRange.slice(-4).reverse().map((point) => {
              const dateKey = getDateStringInAppTimeZone(new Date(point.timestamp));
              return (
                <div key={point.timestamp} className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{formatDateForDisplay(dateKey)}</span>
                  <span className="text-white font-medium">{formatKg(point.bestWeight)}</span>
                </div>
              );
            })}

            {pointsInRange.length === 0 && (
              <div className="text-xs text-slate-500">Cambia a 30d o 90d para ver mas historial.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-sm text-slate-400">
          Completa algunas sesiones con peso para ver tu progreso por ejercicio.
        </div>
      )}
    </div>
  );
};
