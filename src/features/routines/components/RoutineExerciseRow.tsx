import React from 'react';
import { Pencil, Play, Trash2, VideoOff } from 'lucide-react';
import type { Exercise } from '../../../shared/types';
import type { ExerciseDraftValues } from './RoutineEditor';

const MAX_SETS = 30;
const MAX_REPS = 200;
const MAX_REST_TIME_SECONDS = 3600;

interface RoutineExerciseRowProps {
  exercise: Exercise;
  index: number;
  draft?: ExerciseDraftValues;
  isRepsBySetMode: boolean;
  repsBySetDraft?: string[];
  restTimeError: string;
  onEdit: (exercise: Exercise) => void;
  onRemove: (exerciseId: string) => void;
  onToggleRepsBySetMode: (exerciseId: string) => void;
  onNumberChange: (exerciseId: string, field: keyof ExerciseDraftValues, rawValue: string) => void;
  onNumberBlur: (exerciseId: string, field: keyof ExerciseDraftValues, fallback: number) => void;
  onRepsBySetChange: (exerciseId: string, setIndex: number, rawValue: string) => void;
  onRepsBySetBlur: (exerciseId: string, setIndex: number) => void;
}

export const RoutineExerciseRow = React.memo(function RoutineExerciseRow({
  exercise,
  index,
  draft,
  isRepsBySetMode,
  repsBySetDraft,
  restTimeError,
  onEdit,
  onRemove,
  onToggleRepsBySetMode,
  onNumberChange,
  onNumberBlur,
  onRepsBySetChange,
  onRepsBySetBlur
}: RoutineExerciseRowProps) {
  return (
    <div className="motion-list-item app-surface-muted p-2.5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-2">
          <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
            {index + 1}
          </span>
          <h4 dir="auto" className="min-w-0 break-words font-display text-lg text-white" style={{ overflowWrap: 'anywhere' }}>
            {exercise.name}
          </h4>
          {exercise.video?.url ? (
            <Play size={14} className="shrink-0 text-mint" />
          ) : (
            <VideoOff size={14} className="shrink-0 text-slate-500" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(exercise)}
            className="motion-interactive touch-target-sm rounded-lg p-1 text-slate-400 transition-colors hover:text-mint"
            title="Editar ejercicio"
            aria-label={`Editar ejercicio ${exercise.name}`}
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => onRemove(exercise.id)}
            className="motion-interactive touch-target-sm rounded-lg p-1 text-red-400 transition-colors hover:text-red-300"
            title="Eliminar ejercicio"
            aria-label={`Eliminar ejercicio ${exercise.name}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="mb-3 rounded-[0.95rem] bg-white/[0.035] p-1.5">
        <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Modo de reps</span>
          <span className="text-[11px] text-slate-500">
            {isRepsBySetMode ? 'Edita cada serie' : 'Mismo valor para todas'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (isRepsBySetMode) onToggleRepsBySetMode(exercise.id);
            }}
            className={`motion-interactive touch-target-sm rounded-[0.8rem] px-3 py-2 text-sm font-semibold transition-colors ${!isRepsBySetMode
              ? 'bg-mint text-ink shadow-[0_10px_26px_rgba(72,229,163,0.14)]'
              : 'bg-slateDeep/55 text-slate-300 hover:bg-white/[0.07] hover:text-white'}`}
            aria-pressed={!isRepsBySetMode}
            aria-label={`Usar repeticiones fijas en ${exercise.name}`}
          >
            Reps fijas
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isRepsBySetMode) onToggleRepsBySetMode(exercise.id);
            }}
            className={`motion-interactive touch-target-sm rounded-[0.8rem] px-3 py-2 text-sm font-semibold transition-colors ${isRepsBySetMode
              ? 'bg-mint text-ink shadow-[0_10px_26px_rgba(72,229,163,0.14)]'
              : 'bg-slateDeep/55 text-slate-300 hover:bg-white/[0.07] hover:text-white'}`}
            aria-pressed={isRepsBySetMode}
            aria-label={`Usar repeticiones por serie en ${exercise.name}`}
          >
            Por serie
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-sm">
        <div>
          <label htmlFor={`routine-exercise-${exercise.id}-sets`} className="mb-1 block text-slate-300">Series</label>
          <input
            id={`routine-exercise-${exercise.id}-sets`}
            type="number"
            value={draft?.sets ?? String(exercise.sets)}
            onChange={(event) => onNumberChange(exercise.id, 'sets', event.target.value)}
            onBlur={() => onNumberBlur(exercise.id, 'sets', exercise.sets)}
            className="input input-sm"
            min="1"
            max={MAX_SETS}
          />
        </div>

        {isRepsBySetMode ? (
          <div className="col-span-1">
            <span className="mb-1 block text-slate-300">Reps por serie</span>
            <div className="rounded-lg border border-mint/30 bg-mint/5 px-2 py-1.5 text-mint text-xs font-medium">
              {exercise.repsBySet?.join(' / ') ?? exercise.reps}
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor={`routine-exercise-${exercise.id}-reps`} className="mb-1 block text-slate-300">Reps</label>
            <input
              id={`routine-exercise-${exercise.id}-reps`}
              type="number"
              value={draft?.reps ?? String(exercise.reps)}
              onChange={(event) => onNumberChange(exercise.id, 'reps', event.target.value)}
              onBlur={() => onNumberBlur(exercise.id, 'reps', exercise.reps)}
              className="input input-sm"
              min="1"
              max={MAX_REPS}
            />
          </div>
        )}

        <div>
          <label htmlFor={`routine-exercise-${exercise.id}-rest`} className="mb-1 block text-slate-300">Desc. (s)</label>
          <input
            id={`routine-exercise-${exercise.id}-rest`}
            type="number"
            value={draft?.restTime ?? String(exercise.restTime ?? 90)}
            onChange={(event) => onNumberChange(exercise.id, 'restTime', event.target.value)}
            onBlur={() => onNumberBlur(exercise.id, 'restTime', exercise.restTime ?? 90)}
            className={`input input-sm ${restTimeError ? 'border-crimson/55 focus:border-crimson/60 focus:ring-crimson/30' : ''}`}
            min="0"
            step="1"
            max={MAX_REST_TIME_SECONDS}
            aria-invalid={restTimeError ? 'true' : undefined}
            aria-describedby={restTimeError ? `routine-exercise-${exercise.id}-rest-error` : undefined}
          />
          {restTimeError && (
            <p id={`routine-exercise-${exercise.id}-rest-error`} className="mt-1 text-[11px] leading-tight text-crimson">
              {restTimeError}
            </p>
          )}
        </div>
      </div>

      {isRepsBySetMode && (
        <div className="mt-3 rounded-lg border border-mint/25 bg-mint/5 p-3">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="block text-xs font-semibold text-mint">Reps por serie</span>
              <span className="text-[11px] text-slate-400">Ajusta el objetivo de cada serie.</span>
            </div>
            <button
              type="button"
              onClick={() => onToggleRepsBySetMode(exercise.id)}
              className="touch-target-sm self-start rounded-full border border-white/10 bg-slateDeep/70 px-3 py-1 text-[11px] font-semibold text-slate-300 transition-colors hover:border-mint/35 hover:text-white sm:self-auto"
              aria-label={`Volver a repeticiones fijas en ${exercise.name}`}
            >
              Volver a reps fijas
            </button>
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(exercise.sets, 6)}, 1fr)` }}>
            {(repsBySetDraft ?? exercise.repsBySet?.map(String) ?? []).map((reps, setIndex) => (
              <div key={setIndex} className="text-center">
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-slate-400">
                  Serie {setIndex + 1}
                </label>
                <input
                  type="number"
                  value={reps}
                  onChange={(event) => onRepsBySetChange(exercise.id, setIndex, event.target.value)}
                  onBlur={() => onRepsBySetBlur(exercise.id, setIndex)}
                  className="input input-sm w-full text-center"
                  min="1"
                  max={MAX_REPS}
                />
              </div>
            ))}
          </div>
          {exercise.sets > 6 && (
            <p className="mt-2 text-center text-[10px] text-slate-400">
              Mostrando {Math.min(exercise.sets, 6)} de {exercise.sets} series. Ajusta las series para ver más.
            </p>
          )}
        </div>
      )}
    </div>
  );
});
