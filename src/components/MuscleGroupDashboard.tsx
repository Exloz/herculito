import React from 'react';
import { Play, Users, Calendar } from 'lucide-react';
import { Routine, MuscleGroup, User } from '../types';
import { MUSCLE_GROUPS, getRoutinesByMuscleGroup } from '../utils/muscleGroups';
import { MuscleGroupSelector } from './MuscleGroupSelector';
import { MuscleGroupIcon } from './MuscleGroupIcon';

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
    <div className={`bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700 ${isRecommended ? 'ring-2 ring-blue-500' : ''
      }`}>
      {/* Header del grupo muscular */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm sm:text-base"
            style={{ backgroundColor: groupInfo.color }}
          >
            <MuscleGroupIcon
              muscleGroup={muscleGroup}
              size={16}
              color="white"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-white flex items-center space-x-2">
              <span className="truncate">{groupInfo.name}</span>
              {isRecommended && (
                <span className="text-xs bg-blue-600 px-2 py-1 rounded-full whitespace-nowrap">
                  Recomendado
                </span>
              )}
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 truncate">
              {groupRoutines.length} rutina{groupRoutines.length !== 1 ? 's' : ''} disponible{groupRoutines.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Lista de rutinas */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
        {groupRoutines.map((routine) => (
          <div
            key={routine.id}
            className="bg-gray-750 rounded-lg p-3 sm:p-4 border border-gray-600 hover:border-gray-500 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-white truncate pr-2 text-sm sm:text-base">
                {routine.name}
              </h4>
              {routine.isPublic && (
                <div className="flex items-center space-x-1 text-xs text-gray-400 shrink-0">
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

            <div className="space-y-2 mb-3">
              <div className="text-sm text-gray-400">
                {routine.exercises.length} ejercicio{routine.exercises.length !== 1 ? 's' : ''}
              </div>

              {routine.timesUsed && routine.timesUsed > 0 && (
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Calendar size={12} />
                  <span>Usado {routine.timesUsed} veces</span>
                </div>
              )}

               {routine.createdBy && routine.createdBy !== (currentUser as unknown as string) && (
                 <div className="text-xs text-gray-500">
                   Por {routine.createdByName || 'Otro usuario'}
                 </div>
               )}
            </div>

            {/* Ejercicios principales */}
            <div className="mb-3">
              <div className="text-xs text-gray-400 mb-1">Ejercicios:</div>
              <div className="text-xs text-gray-300 space-y-1">
                {routine.exercises.slice(0, 3).map((exercise, idx) => (
                  <div key={idx} className="truncate">
                    • {exercise.name} ({exercise.sets}×{exercise.reps})
                  </div>
                ))}
                {routine.exercises.length > 3 && (
                  <div className="text-gray-500">
                    +{routine.exercises.length - 3} más
                  </div>
                )}
              </div>
            </div>

            {/* Botón de iniciar */}
            <button
              onClick={() => onStartWorkout(routine.id)}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-3 py-2.5 sm:py-2 rounded-lg 
                       transition-colors flex items-center justify-center space-x-2 text-sm font-medium touch-manipulation"
            >
              <Play size={16} />
              <span className="hidden sm:inline">Iniciar Entrenamiento</span>
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
      {/* Información de recomendación */}
      {recommendedGroup && (
        <div className="bg-blue-900/50 border border-blue-700 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <h3 className="text-blue-400 font-medium">Grupo muscular recomendado</h3>
          </div>
          <p className="text-gray-300 text-sm">
            Basado en tu historial de entrenamientos, te recomendamos entrenar{' '}
            <span className="font-semibold text-blue-400">
              {MUSCLE_GROUPS[recommendedGroup].name}
            </span>{' '}
            hoy.
          </p>
        </div>
      )}

      {/* Secciones de grupos musculares */}
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