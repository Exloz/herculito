import React from 'react';
import { ArrowUpRight, Calendar, Play, Sparkles, Users } from 'lucide-react';
import { MuscleGroup, Routine, User } from '../../../shared/types';
import { MUSCLE_GROUPS, getRoutinesByMuscleGroup } from '../lib/muscleGroups';
import { vibrateLight } from '../../../shared/lib/mobileFeedback';
import { MuscleGroupIcon } from './MuscleGroupIcon';
import { MuscleGroupSelector } from './MuscleGroupSelector';

interface MuscleGroupSectionProps {
  muscleGroup: MuscleGroup;
  routines: Routine[];
  currentUser: User;
  onStartWorkout: (routineId: string) => void;
  onRoutineMuscleGroupChange: (routineId: string, newMuscleGroup: MuscleGroup) => void;
  isRecommended?: boolean;
}

const getSectionCopy = (muscleGroup: MuscleGroup): string => {
  switch (muscleGroup) {
    case 'pecho':
      return 'Empuje, control y volumen para abrir la sesion con fuerza.';
    case 'espalda':
      return 'Tiron, postura y densidad para construir una base solida.';
    case 'piernas':
      return 'Potencia y resistencia para sostener progreso real.';
    case 'hombros':
      return 'Estabilidad, precision y trabajo limpio en la parte superior.';
    case 'brazos':
      return 'Aislamiento util para cerrar la semana con detalle.';
    case 'core':
      return 'Estabilidad central para transferir fuerza a todo el cuerpo.';
    default:
      return 'Sesiones versatiles para dias de trabajo completo.';
  }
};

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
    <section
      className={`relative overflow-hidden rounded-[1.8rem] border p-4 sm:p-5 ${isRecommended
        ? 'border-mint/35 bg-[radial-gradient(circle_at_top_left,_rgba(72,229,163,0.16),_transparent_38%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(17,24,39,0.92))] shadow-[0_18px_60px_rgba(72,229,163,0.08)]'
        : 'border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(17,24,39,0.88))]'
        }`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="absolute -right-12 -top-8 h-32 w-32 rounded-full blur-3xl" style={{ backgroundColor: `${groupInfo.color}22` }} />

      <div className="relative mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 text-white shadow-[0_12px_30px_rgba(2,6,23,0.18)]"
              style={{ backgroundColor: groupInfo.color }}
            >
              <MuscleGroupIcon muscleGroup={muscleGroup} size={18} color="white" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-xl text-white">{groupInfo.name}</h3>
                {isRecommended ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-mint/25 bg-mint/10 px-3 py-1 text-xs font-semibold text-mint">
                    <Sparkles size={12} />
                    Recomendado hoy
                  </span>
                ) : null}
              </div>

              <p className="mt-1 max-w-2xl text-sm text-slate-300">{getSectionCopy(muscleGroup)}</p>
            </div>
          </div>
        </div>

        <div className="self-start rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-right">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Disponibles</div>
          <div className="mt-1 font-display text-2xl text-white">{groupRoutines.length}</div>
          <div className="text-xs text-slate-400">rutina{groupRoutines.length === 1 ? '' : 's'}</div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
        {groupRoutines.map((routine) => {
          const isOwnedByCurrentUser = routine.createdBy === currentUser.id;

          return (
            <article
              key={routine.id}
              className="group relative overflow-hidden rounded-[1.45rem] border border-white/8 bg-[linear-gradient(145deg,rgba(15,23,42,0.86),rgba(30,41,59,0.48))] p-4 transition-all duration-200 hover:-translate-y-1 hover:border-white/15 hover:shadow-[0_18px_44px_rgba(2,6,23,0.24)]"
            >
              <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: groupInfo.color }} />

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/5 px-2 py-1 text-slate-200">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: groupInfo.color }} />
                      {groupInfo.name}
                    </span>
                    {routine.isPublic ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/5 px-2 py-1 text-slate-200">
                        <Users size={11} />
                        Compartida
                      </span>
                    ) : null}
                  </div>

                  <h4 className="mt-3 truncate pr-6 text-base font-semibold text-white sm:text-lg">{routine.name}</h4>
                  <p className="mt-1 text-xs text-slate-400">
                    {routine.exercises.length} ejercicio{routine.exercises.length === 1 ? '' : 's'} listos para entrenar.
                  </p>
                </div>

                <div className="rounded-full border border-white/8 bg-white/5 p-2 text-slate-300 transition-colors group-hover:text-white">
                  <ArrowUpRight size={15} />
                </div>
              </div>

              <div className="mt-4 rounded-[1.15rem] border border-white/8 bg-white/[0.04] p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Grupo principal</div>
                <div className="mt-2">
                  <MuscleGroupSelector
                    currentGroup={routine.primaryMuscleGroup || 'fullbody'}
                    onGroupChange={(newGroup) => onRoutineMuscleGroupChange(routine.id, newGroup)}
                    disabled={!isOwnedByCurrentUser}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-200">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/5 px-3 py-1">
                  <Calendar size={12} className="text-amberGlow" />
                  {routine.timesUsed && routine.timesUsed > 0 ? `Usada ${routine.timesUsed} veces` : 'Sin uso reciente'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/5 px-3 py-1">
                  <Play size={12} className="text-mint" />
                  Inicio rapido
                </span>
              </div>

              <div className="mt-3 rounded-[1.15rem] border border-white/8 bg-black/10 p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Preview</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {routine.exercises.slice(0, 3).map((exercise) => (
                    <span
                      key={exercise.id}
                      className="rounded-full border border-white/8 bg-white/[0.05] px-2.5 py-1 text-xs text-slate-200"
                    >
                      {exercise.name} · {exercise.sets}x{exercise.reps}
                    </span>
                  ))}
                  {routine.exercises.length > 3 ? (
                    <span className="rounded-full border border-white/8 bg-white/[0.05] px-2.5 py-1 text-xs text-slate-400">
                      +{routine.exercises.length - 3} mas
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="min-w-0 text-xs text-slate-400">
                  {isOwnedByCurrentUser ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/5 px-3 py-1 text-slate-200">
                      Tu rutina
                    </span>
                  ) : routine.createdBy ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/5 px-3 py-1 text-slate-200">
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
                      Por {routine.createdByName || 'Otro usuario'}
                    </span>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    vibrateLight();
                    onStartWorkout(routine.id);
                  }}
                  className="btn-primary flex shrink-0 items-center gap-2 touch-target"
                >
                  <Play size={16} />
                  <span>Iniciar</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
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
  const muscleGroups: MuscleGroup[] = ['pecho', 'espalda', 'piernas', 'hombros', 'brazos', 'core', 'fullbody'];

  const orderedGroups = [...muscleGroups].sort((a, b) => {
    if (a === recommendedGroup) return -1;
    if (b === recommendedGroup) return 1;
    return 0;
  });

  return (
    <div className="space-y-6">
      {recommendedGroup ? (
        <div className="relative overflow-hidden rounded-[1.7rem] border border-mint/20 bg-[radial-gradient(circle_at_top_left,_rgba(72,229,163,0.18),_transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(17,24,39,0.92))] p-4 sm:p-5">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-mint/10 blur-3xl" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-mint/20 bg-mint/10 px-3 py-1 text-xs font-semibold text-mint">
                <Sparkles size={13} />
                Recomendado hoy
              </div>
              <p className="mt-3 text-sm text-slate-200 sm:text-base">
                Basado en tu historial reciente, hoy tiene sentido enfocarte en{' '}
                <span className="font-semibold text-white">{MUSCLE_GROUPS[recommendedGroup].name}</span>.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-right">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Enfoque sugerido</div>
              <div className="mt-1 font-display text-2xl text-white">{MUSCLE_GROUPS[recommendedGroup].name}</div>
            </div>
          </div>
        </div>
      ) : null}

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
