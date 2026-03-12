import React from 'react';
import { Play, Users, Calendar } from 'lucide-react';
import { Routine, MuscleGroup, User } from '../../../shared/types';
import { MUSCLE_GROUPS, getRoutinesByMuscleGroup } from '../lib/muscleGroups';
import { vibrateLight } from '../../../shared/lib/mobileFeedback';
import { MuscleGroupSelector } from './MuscleGroupSelector';
import { MuscleGroupIcon } from './MuscleGroupIcon';
import { formatCountLabel } from '../../../shared/lib/intl';

interface MuscleGroupSectionProps {
  muscleGroup: MuscleGroup;
  routines: Routine[];
  currentUser: User;
  onStartWorkout: (routineId: string) => void;
  onRoutineMuscleGroupChange: (routineId: string, newMuscleGroup: MuscleGroup) => void;
  isRecommended?: boolean;
}

const MuscleGroupSection: React.FC<MuscleGroupSectionProps> = ({
  muscleGroup,
  routines,
  currentUser,
  onStartWorkout,
  onRoutineMuscleGroupChange,
  isRecommended
}) => {
  const groupInfo = MUSCLE_GROUPS[muscleGroup];
  const groupRoutines = getRoutinesByMuscleGroup(routines, muscleGroup);

  if (groupRoutines.length === 0) return null;

  return (
    <div className={`relative overflow-hidden rounded-[1.8rem] border p-4 shadow-lift sm:p-5 ${isRecommended ? 'border-mint/40 bg-[linear-gradient(180deg,rgba(23,33,31,0.98),rgba(11,15,20,0.98))]' : 'border-mist/60 bg-graphite'}`}>
      <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: groupInfo.color }} />

      <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white sm:h-10 sm:w-10"
            style={{ backgroundColor: groupInfo.color }}
          >
            <MuscleGroupIcon
              muscleGroup={muscleGroup}
              size={18}
              color="white"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              {isRecommended ? 'Sugerido hoy' : 'Grupo muscular'}
            </div>
            <h3 className="flex items-center space-x-2 font-display text-2xl uppercase text-white sm:text-[1.85rem]">
              <span className="truncate">{groupInfo.name}</span>
              {isRecommended && (
                <span className="rounded-full border border-mint/25 bg-mint/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-mint whitespace-nowrap">
                  Hoy
                </span>
              )}
              </h3>
            <p className="truncate text-sm text-slate-300">
              {formatCountLabel(groupRoutines.length, 'rutina disponible', 'rutinas disponibles')}
            </p>
          </div>
        </div>

        <div className="hidden rounded-[1.15rem] border border-white/10 bg-white/[0.04] px-3 py-2 text-right sm:block">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Listas</div>
          <div className="mt-1 font-display text-xl text-white">{groupRoutines.length}</div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {groupRoutines.map((routine) => (
          <div
            key={routine.id}
            className="rounded-[1.4rem] border border-white/8 bg-slateDeep/80 p-3.5 transition-colors hover:border-mint/35 sm:p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="pr-2 font-semibold text-white truncate text-sm sm:text-base">
                {routine.name}
              </h4>
              {routine.isPublic && (
                <div className="flex items-center space-x-1 text-xs text-slate-400 shrink-0">
                  <Users size={12} />
                </div>
              )}
            </div>

            {/* Selector de grupo muscular */}
            <div className="mb-2 sm:mb-3">
              <MuscleGroupSelector
                currentGroup={routine.primaryMuscleGroup || 'fullbody'}
                onGroupChange={(newGroup) => onRoutineMuscleGroupChange(routine.id, newGroup)}
                disabled={routine.createdBy !== currentUser.id}
              />
            </div>

            <div className="mb-3 space-y-2.5">
              <div className="text-sm text-slate-400">
                {formatCountLabel(routine.exercises.length, 'ejercicio', 'ejercicios')}
              </div>

              {routine.timesUsed && routine.timesUsed > 0 && (
                <div className="flex items-center space-x-1 text-xs text-slate-500">
                  <Calendar size={12} />
                  <span>Usado {routine.timesUsed} veces</span>
                </div>
              )}

               {routine.createdBy && routine.createdBy !== currentUser.id && (
                 <div className="flex items-center gap-1.5 text-xs text-slate-500">
                   {routine.createdByAvatarUrl ? (
                     <img
                       src={routine.createdByAvatarUrl}
                       alt={`Foto de ${routine.createdByName || 'usuario'}`}
                       className="h-4 w-4 rounded-full object-cover"
                       referrerPolicy="no-referrer"
                     />
                   ) : (
                     <Users size={12} />
                   )}
                   <span>Por {routine.createdByName || 'Otro usuario'}</span>
                 </div>
               )}
            </div>

            {/* Ejercicios principales */}
            <div className="mb-4 rounded-[1.1rem] border border-white/8 bg-white/[0.03] px-3 py-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Primeros ejercicios</div>
              <div className="space-y-1.5 text-xs text-slate-300">
                {routine.exercises.slice(0, 3).map((exercise) => (
                  <div key={exercise.id} className="truncate">
                    • {exercise.name} ({exercise.sets}×{exercise.reps})
                  </div>
                ))}
                {routine.exercises.length > 3 && (
                  <div className="text-slate-500">
                    +{routine.exercises.length - 3} más
                  </div>
                )}
              </div>
            </div>

            {/* Botón de iniciar */}
            <button
              type="button"
              onClick={() => {
                vibrateLight();
                onStartWorkout(routine.id);
              }}
              className="btn-primary flex w-full items-center justify-center gap-2 text-sm touch-target"
            >
              <Play size={16} />
              <span className="hidden sm:inline">Iniciar entrenamiento</span>
              <span className="sm:hidden">Iniciar</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

interface MuscleGroupDashboardProps {
  routines: Routine[];
  currentUser: User;
  onStartWorkout: (routineId: string) => void;
  onRoutineMuscleGroupChange: (routineId: string, newMuscleGroup: MuscleGroup) => void;
  recommendedGroup?: MuscleGroup | null;
}

export const MuscleGroupDashboard: React.FC<MuscleGroupDashboardProps> = ({
  routines,
  currentUser,
  onStartWorkout,
  onRoutineMuscleGroupChange,
  recommendedGroup
}) => {
  // Organizar rutinas por grupo muscular
  const muscleGroups: MuscleGroup[] = ['pecho', 'espalda', 'piernas', 'hombros', 'brazos', 'core', 'fullbody'];

  // Ordenar grupos con el recomendado primero
  const orderedGroups = [...muscleGroups].sort((a, b) => {
    if (a === recommendedGroup) return -1;
    if (b === recommendedGroup) return 1;
    return 0;
  });

  return (
    <div className="space-y-6">
      {recommendedGroup && (
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <span className="chip">Sugerido hoy</span>
          <span className="font-semibold text-white">{MUSCLE_GROUPS[recommendedGroup].name}</span>
        </div>
      )}

      {orderedGroups.map((muscleGroup) => (
        <MuscleGroupSection
          key={muscleGroup}
          muscleGroup={muscleGroup}
          routines={routines}
          currentUser={currentUser}
          onStartWorkout={onStartWorkout}
          onRoutineMuscleGroupChange={onRoutineMuscleGroupChange}
          isRecommended={muscleGroup === recommendedGroup}
        />
      ))}
    </div>
  );
};
