import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Edit, Eye, Target, Trash2, User as UserIcon } from 'lucide-react';
import type { Routine, User } from '../../../shared/types';
import { formatDateInAppTimeZone } from '../../../shared/lib/dateUtils';
import { MUSCLE_GROUPS } from '../../dashboard/lib/muscleGroups';

interface RoutineCardProps {
  routine: Routine;
  user: User;
  activeTab: 'my' | 'public';
  canEditRoutine: (routine: Routine) => boolean;
  isVisibleOnDashboard: boolean;
  isRoutineVisibilityLoading: boolean;
  isRoutineVisibilityUpdating: (routineId: string) => boolean;
  onEdit: (routine: Routine) => void;
  onDelete: (routineId: string) => void;
  onToggleVisibility: (routineId: string, nextVisible: boolean) => void;
}

export const RoutineCard: React.FC<RoutineCardProps> = ({
  routine,
  user,
  activeTab,
  canEditRoutine,
  isVisibleOnDashboard,
  isRoutineVisibilityLoading,
  isRoutineVisibilityUpdating,
  onEdit,
  onDelete,
  onToggleVisibility
}) => {
  const [expanded, setExpanded] = useState(false);
  const accentColor = routine.primaryMuscleGroup ? MUSCLE_GROUPS[routine.primaryMuscleGroup].color : '#48e5a3';
  const previewExercises = routine.exercises.slice(0, 2);

  return (
    <div className="motion-enter overflow-hidden rounded-[1.5rem] bg-graphite shadow-lift content-fade-in">
      <div className="h-1" style={{ backgroundColor: accentColor }} />

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              {!routine.isPublic && <span className="rounded-full bg-white/[0.05] px-2.5 py-1 uppercase tracking-[0.16em]">Privada</span>}
              {routine.createdBy !== user.id && <span className="rounded-full bg-amberGlow/12 px-2.5 py-1 uppercase tracking-[0.16em] text-amberGlow">Comunidad</span>}
              {routine.primaryMuscleGroup && (
                <span className="rounded-full bg-white/[0.05] px-2.5 py-1 uppercase tracking-[0.16em] text-slate-300">
                  {MUSCLE_GROUPS[routine.primaryMuscleGroup].name}
                </span>
              )}
            </div>

            <h3
              dir="auto"
              className="mt-2 min-w-0 break-words font-display text-[1.5rem] leading-[0.95] text-white sm:text-[1.9rem]"
              style={{ overflowWrap: 'anywhere' }}
            >
              {routine.name}
            </h3>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2.5 py-1">
                <Target size={12} />
                {routine.exercises.length} ejercicios
              </span>

              {routine.timesUsed && routine.timesUsed > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2.5 py-1">
                  <Eye size={12} />
                  {routine.timesUsed} usos
                </span>
              )}

              <span className="rounded-full bg-white/[0.05] px-2.5 py-1">
                {routine.createdAt ? formatDateInAppTimeZone(routine.createdAt, 'es-CO') : ''}
              </span>

              {routine.createdBy !== user.id && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2.5 py-1">
                  {routine.createdByAvatarUrl ? (
                    <img
                      src={routine.createdByAvatarUrl}
                      alt={`Foto de ${routine.createdByName || 'usuario'}`}
                      className="h-4 w-4 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <UserIcon size={12} />
                  )}
                  <span>Por {routine.createdByName || 'Otro usuario'}</span>
                </span>
              )}
            </div>

            <div className="mt-3 text-sm text-slate-300">
              {previewExercises.length > 0
                ? previewExercises.map((exercise) => {
                    const repsDisplay = exercise.repsBySet && exercise.repsBySet.length > 0
                      ? exercise.repsBySet.join('/')
                      : String(exercise.reps);
                    return `${exercise.name} (${exercise.sets}x${repsDisplay})`;
                  }).join(' - ')
                : 'Sin ejercicios todavía'}
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            {canEditRoutine(routine) && (
              <>
                <button
                  onClick={() => onEdit(routine)}
                  className="btn-ghost bg-white/[0.03]"
                  title="Editar rutina"
                  aria-label={`Editar rutina ${routine.name}`}
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => onDelete(routine.id)}
                  className="btn-ghost bg-white/[0.03] text-crimson hover:text-red-400"
                  title="Eliminar rutina"
                  aria-label={`Eliminar rutina ${routine.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        {activeTab === 'public' && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-[1rem] bg-white/[0.03] px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold text-slate-100">En Inicio</p>
              <p className="text-xs text-slate-400">
                {isVisibleOnDashboard ? 'Visible en dashboard' : 'Oculta del dashboard'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isVisibleOnDashboard}
              onClick={() => {
                onToggleVisibility(routine.id, !isVisibleOnDashboard);
              }}
              disabled={isRoutineVisibilityLoading || isRoutineVisibilityUpdating(routine.id)}
              className={`relative inline-flex h-6 w-11 min-h-0 min-w-0 shrink-0 items-center rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:cursor-not-allowed disabled:opacity-60 ${isVisibleOnDashboard ? 'bg-mint' : 'bg-slate-600'}`}
              aria-label={isVisibleOnDashboard
                ? `Ocultar ${routine.name} del inicio`
                : `Mostrar ${routine.name} en inicio`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-all ${isVisibleOnDashboard ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="motion-interactive inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-mint/85"
            aria-expanded={expanded}
          >
            <span>{expanded ? 'Ocultar detalles' : 'Ver detalles'}</span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {expanded && (
          <div className="mt-3 rounded-[1.1rem] bg-slateDeep/55 px-3 py-3">
            {routine.description && (
              <p
                dir="auto"
                className="mb-3 break-words text-sm leading-relaxed text-slate-300"
                style={{ overflowWrap: 'anywhere' }}
              >
                {routine.description}
              </p>
            )}

            {routine.exercises.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Ejercicios</p>
                <div className="space-y-1.5">
                  {routine.exercises.slice(0, 4).map((exercise) => {
                    const repsDisplay = exercise.repsBySet && exercise.repsBySet.length > 0
                      ? exercise.repsBySet.join('/')
                      : String(exercise.reps);
                    return (
                      <div key={exercise.id} className="flex items-center justify-between rounded-xl bg-black/10 px-3 py-2 text-sm text-slate-200">
                        <span className="truncate pr-3">{exercise.name}</span>
                        <span className="shrink-0 text-xs text-slate-500">{exercise.sets} x {repsDisplay}</span>
                      </div>
                    );
                  })}
                  {routine.exercises.length > 4 && (
                    <div className="text-xs text-slate-500">... y {routine.exercises.length - 4} más</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
