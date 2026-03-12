import React from 'react';
import { Edit, Eye, Target, Trash2, User as UserIcon } from 'lucide-react';
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
  const accentColor = routine.primaryMuscleGroup ? MUSCLE_GROUPS[routine.primaryMuscleGroup].color : '#48e5a3';

  return (
    <div className="relative overflow-hidden rounded-[1.8rem] border border-mist/60 bg-graphite p-4 shadow-lift content-fade-in sm:p-5">
      <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: accentColor }} />

      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {!routine.isPublic && <span className="chip">Privada</span>}
            {routine.createdBy !== user.id && <span className="chip-warm">Comunidad</span>}
            {routine.primaryMuscleGroup && (
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                {MUSCLE_GROUPS[routine.primaryMuscleGroup].name}
              </span>
            )}
          </div>

          <h3 dir="auto" className="min-w-0 break-words font-display text-[1.9rem] uppercase leading-[0.92] text-white" style={{ overflowWrap: 'anywhere' }}>{routine.name}</h3>

          {routine.description && (
            <p dir="auto" className="mt-3 max-w-2xl break-words text-sm leading-relaxed text-slate-300" style={{ overflowWrap: 'anywhere' }}>{routine.description}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <div className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">
              <Target size={14} className="mr-1" />
              <span>{routine.exercises.length} ejercicios</span>
            </div>

            {routine.timesUsed && routine.timesUsed > 0 && (
              <div className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">
                <Eye size={14} className="mr-1" />
                <span>Usada {routine.timesUsed} veces</span>
              </div>
            )}

            {routine.createdBy !== user.id && (
              <div className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">
                {routine.createdByAvatarUrl ? (
                  <img
                    src={routine.createdByAvatarUrl}
                    alt={`Foto de ${routine.createdByName || 'usuario'}`}
                    className="mr-1 h-4 w-4 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <UserIcon size={14} className="mr-1" />
                )}
                <span>Por {routine.createdByName || 'Otro usuario'}</span>
              </div>
            )}

            <div className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">
              <span>Creada {routine.createdAt ? formatDateInAppTimeZone(routine.createdAt, 'es-CO') : ''}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {canEditRoutine(routine) && (
            <>
              <button
                onClick={() => onEdit(routine)}
                className="btn-ghost border border-white/8 bg-white/[0.03]"
                title="Editar rutina"
                aria-label={`Editar rutina ${routine.name}`}
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => onDelete(routine.id)}
                className="btn-ghost border border-white/8 bg-white/[0.03] text-crimson hover:text-red-400"
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
        <div className="mb-4 flex items-center justify-between gap-3 rounded-[1.3rem] border border-mist/50 bg-slateDeep/70 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-100">Mostrar en Inicio</p>
            <p className="mt-1 text-xs text-slate-400">Activa esta rutina para verla en tu dashboard.</p>
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

      {routine.exercises.length > 0 && (
        <div className="mt-4 border-t border-mist/40 pt-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Primeros ejercicios</p>
          <div className="space-y-2">
            {routine.exercises.slice(0, 3).map((exercise) => (
              <div key={exercise.id} className="flex items-center justify-between rounded-[1rem] border border-white/8 bg-slateDeep/60 px-3 py-2 text-sm text-slate-200">
                <span className="truncate pr-3">{exercise.name}</span>
                <span className="shrink-0 text-xs text-slate-500">{exercise.sets} x {exercise.reps}</span>
              </div>
            ))}
            {routine.exercises.length > 3 && (
              <div className="text-xs text-slate-500">... y {routine.exercises.length - 3} más</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
