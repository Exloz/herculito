import React from 'react';
import { Edit, Eye, Target, Trash2, User as UserIcon } from 'lucide-react';
import type { Routine, User } from '../../../shared/types';
import { formatDateInAppTimeZone } from '../../../shared/lib/dateUtils';

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
  return (
    <div className="app-card p-4 sm:p-5 content-fade-in">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 dir="auto" className="min-w-0 break-words text-lg font-display text-white" style={{ overflowWrap: 'anywhere' }}>{routine.name}</h3>
            {!routine.isPublic && <span className="chip">Privada</span>}
            {routine.createdBy !== user.id && <span className="chip-warm">Comunidad</span>}
          </div>

          {routine.description && (
            <p dir="auto" className="mb-2 text-sm text-slate-300 break-words" style={{ overflowWrap: 'anywhere' }}>{routine.description}</p>
          )}

          <div className="flex items-center text-sm text-slate-400 flex-wrap gap-x-3 gap-y-1">
            <div className="flex items-center">
              <Target size={14} className="mr-1" />
              <span>{routine.exercises.length} ejercicios</span>
            </div>

            {routine.timesUsed && routine.timesUsed > 0 && (
              <div className="flex items-center">
                <Eye size={14} className="mr-1" />
                <span>Usada {routine.timesUsed} veces</span>
              </div>
            )}

            {routine.createdBy !== user.id && (
              <div className="flex items-center">
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

            <span>Creada {routine.createdAt ? formatDateInAppTimeZone(routine.createdAt, 'es-CO') : ''}</span>
          </div>
        </div>

        <div className="flex gap-2">
          {canEditRoutine(routine) && (
            <>
              <button
                onClick={() => onEdit(routine)}
                className="btn-ghost"
                title="Editar rutina"
                aria-label={`Editar rutina ${routine.name}`}
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => onDelete(routine.id)}
                className="btn-ghost text-crimson hover:text-red-400"
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
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-200">Mostrar en Inicio</p>
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
        <div className="mt-3 pt-3 app-divider">
          <p className="text-xs text-slate-400 mb-2">Ejercicios:</p>
          <div className="space-y-1">
            {routine.exercises.slice(0, 3).map((exercise) => (
              <div key={exercise.id} className="text-sm text-slate-200 flex items-center justify-between">
                <span>- {exercise.name}</span>
                <span className="text-xs text-slate-500">{exercise.sets} x {exercise.reps}</span>
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
