import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, Play, Users } from 'lucide-react';
import { Routine, MuscleGroup, User } from '../../../shared/types';
import { MUSCLE_GROUPS, getRoutinesByMuscleGroup } from '../lib/muscleGroups';
import { vibrateLight } from '../../../shared/lib/mobileFeedback';
import { MuscleGroupSelector } from './MuscleGroupSelector';
import { MuscleGroupIcon } from './MuscleGroupIcon';
import { formatCountLabel } from '../../../shared/lib/intl';

const MUSCLE_GROUP_ORDER: MuscleGroup[] = ['pecho', 'espalda', 'piernas', 'hombros', 'brazos', 'core', 'fullbody'];

interface MuscleGroupSectionProps {
  muscleGroup: MuscleGroup;
  groupRoutines: Routine[];
  currentUser: User;
  onStartWorkout: (routineId: string) => void;
  onRoutineMuscleGroupChange: (routineId: string, newMuscleGroup: MuscleGroup) => void;
  isRecommended?: boolean;
}

const MuscleGroupSection: React.FC<MuscleGroupSectionProps> = ({
  muscleGroup,
  groupRoutines,
  currentUser,
  onStartWorkout,
  onRoutineMuscleGroupChange,
  isRecommended
}) => {
  const groupInfo = MUSCLE_GROUPS[muscleGroup];
  const [expandedRoutineId, setExpandedRoutineId] = useState<string | null>(groupRoutines[0]?.id ?? null);

  useEffect(() => {
    setExpandedRoutineId((current) => {
      if (current && groupRoutines.some((routine) => routine.id === current)) {
        return current;
      }

      return groupRoutines[0]?.id ?? null;
    });
  }, [groupRoutines]);

  if (groupRoutines.length === 0) return null;

  return (
    <div className={`overflow-hidden rounded-[1.6rem] shadow-lift ${isRecommended ? 'bg-[linear-gradient(180deg,rgba(23,33,31,0.96),rgba(11,15,20,0.98))]' : 'bg-graphite'}`}>
      <div className="h-1" style={{ backgroundColor: groupInfo.color }} />

      <div className="px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: groupInfo.color }}
              >
                <MuscleGroupIcon muscleGroup={muscleGroup} size={18} color="white" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  <span>{isRecommended ? 'Sugerido hoy' : 'Grupo muscular'}</span>
                  {isRecommended && (
                    <span className="rounded-full bg-mint/12 px-2 py-1 text-[10px] text-mint">Hoy</span>
                  )}
                </div>
                <h3 className="truncate font-display text-2xl uppercase text-white sm:text-[1.8rem]">{groupInfo.name}</h3>
                <p className="mt-1 text-sm text-slate-300">
                  {formatCountLabel(groupRoutines.length, 'rutina disponible', 'rutinas disponibles')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 divide-y divide-white/8">
          {groupRoutines.map((routine, index) => {
            const isExpanded = expandedRoutineId === routine.id;
            const previewExercises = routine.exercises.slice(0, 2);

            return (
              <div key={routine.id} className={`${index === 0 ? 'pt-0' : 'pt-4'} ${index === groupRoutines.length - 1 ? 'pb-0' : 'pb-4'}`}>
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setExpandedRoutineId((current) => current === routine.id ? null : routine.id)}
                    className="min-w-0 flex-1 text-left"
                    aria-expanded={isExpanded}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      {routine.isPublic && <span className="rounded-full bg-white/[0.05] px-2.5 py-1 uppercase tracking-[0.16em]">Publica</span>}
                      <span className="rounded-full bg-white/[0.05] px-2.5 py-1">
                        {formatCountLabel(routine.exercises.length, 'ejercicio', 'ejercicios')}
                      </span>
                      {routine.timesUsed && routine.timesUsed > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2.5 py-1">
                          <Calendar size={11} />
                          {routine.timesUsed} usos
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate text-base font-semibold text-white sm:text-lg">{routine.name}</h4>
                        <div className="mt-1 text-sm text-slate-400">
                          {previewExercises.length > 0
                            ? previewExercises.map((exercise) => `${exercise.name} (${exercise.sets}x${exercise.reps})`).join(' - ')
                            : 'Sin ejercicios todavia'}
                        </div>
                        {routine.createdBy && routine.createdBy !== currentUser.id && (
                          <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500">
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
                    </div>

                    <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-mint/85">
                      <span>{isExpanded ? 'Ocultar detalles' : 'Ver detalles'}</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      vibrateLight();
                      onStartWorkout(routine.id);
                    }}
                    className="btn-primary shrink-0 px-3 py-2 text-sm touch-target"
                    aria-label={`Iniciar ${routine.name}`}
                  >
                    <span className="hidden items-center gap-2 sm:inline-flex">
                      <Play size={15} />
                      Iniciar
                    </span>
                    <span className="sm:hidden">
                      <Play size={15} />
                    </span>
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-3 rounded-[1.2rem] bg-slateDeep/55 px-3 py-3">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)]">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Ejercicios</div>
                        <div className="mt-2 space-y-1.5">
                          {routine.exercises.slice(0, 4).map((exercise) => (
                            <div key={exercise.id} className="flex items-center justify-between gap-3 rounded-xl bg-black/10 px-3 py-2 text-sm text-slate-200">
                              <span className="min-w-0 truncate">{exercise.name}</span>
                              <span className="shrink-0 text-xs text-slate-500">{exercise.sets}x{exercise.reps}</span>
                            </div>
                          ))}
                          {routine.exercises.length > 4 && (
                            <div className="text-xs text-slate-500">+{routine.exercises.length - 4} ejercicios mas</div>
                          )}
                        </div>
                        {routine.description && (
                          <p className="mt-3 text-xs leading-relaxed text-slate-400">{routine.description}</p>
                        )}
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Grupo</div>
                        <div className="mt-2">
                          <MuscleGroupSelector
                            currentGroup={routine.primaryMuscleGroup || 'fullbody'}
                            onGroupChange={(newGroup) => onRoutineMuscleGroupChange(routine.id, newGroup)}
                            disabled={routine.createdBy !== currentUser.id}
                          />
                        </div>
                        <div className="mt-3 text-xs text-slate-500">
                          {routine.createdBy === currentUser.id
                            ? 'Puedes ajustar la clasificacion sin salir del dashboard.'
                            : 'Puedes revisar la rutina y empezarla directo.'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
  const availableGroups = useMemo(() => {
    return MUSCLE_GROUP_ORDER.filter((muscleGroup) => getRoutinesByMuscleGroup(routines, muscleGroup).length > 0);
  }, [routines]);
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup | null>(recommendedGroup ?? null);

  useEffect(() => {
    setSelectedGroup((current) => {
      if (current && availableGroups.includes(current)) {
        return current;
      }

      if (recommendedGroup && availableGroups.includes(recommendedGroup)) {
        return recommendedGroup;
      }

      return availableGroups[0] ?? null;
    });
  }, [availableGroups, recommendedGroup]);

  const selectedGroupRoutines = useMemo(() => {
    if (!selectedGroup) return [];
    return getRoutinesByMuscleGroup(routines, selectedGroup);
  }, [routines, selectedGroup]);

  if (availableGroups.length === 0) {
    return (
      <div className="rounded-[1.6rem] bg-slateDeep/45 px-4 py-8 text-center">
        <div className="font-display text-lg uppercase text-white">No hay rutinas todavia</div>
        <p className="mt-2 text-sm text-slate-400">Crea tu primera rutina para verla organizada por grupo muscular.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {availableGroups.map((muscleGroup) => {
          const groupInfo = MUSCLE_GROUPS[muscleGroup];
          const routineCount = getRoutinesByMuscleGroup(routines, muscleGroup).length;
          const isActive = selectedGroup === muscleGroup;
          const isRecommended = muscleGroup === recommendedGroup;

          return (
            <button
              key={muscleGroup}
              type="button"
              onClick={() => setSelectedGroup(muscleGroup)}
              className={`rounded-[1.1rem] px-3 py-3 text-left transition-colors ${isActive ? 'bg-slateDeep text-white shadow-soft' : 'bg-white/[0.03] text-slate-300 hover:bg-white/[0.05]'} `}
              aria-pressed={isActive}
            >
              <div className="flex items-center gap-2">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: groupInfo.color }}
                >
                  <MuscleGroupIcon muscleGroup={muscleGroup} size={15} color="white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{groupInfo.name}</span>
                    {isRecommended && <span className="rounded-full bg-mint/12 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-mint">Hoy</span>}
                  </div>
                  <div className="text-[11px] text-slate-500">{formatCountLabel(routineCount, 'rutina', 'rutinas')}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedGroup && (
        <MuscleGroupSection
          muscleGroup={selectedGroup}
          groupRoutines={selectedGroupRoutines}
          currentUser={currentUser}
          onStartWorkout={onStartWorkout}
          onRoutineMuscleGroupChange={onRoutineMuscleGroupChange}
          isRecommended={selectedGroup === recommendedGroup}
        />
      )}
    </div>
  );
};
