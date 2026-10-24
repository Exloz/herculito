import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Play, Users } from 'lucide-react';
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
  const [expandedRoutineId, setExpandedRoutineId] = useState<string | null>(null);
  const detailsPrefix = useId();

  useEffect(() => {
    setExpandedRoutineId((current) => {
      if (current && groupRoutines.some((routine) => routine.id === current)) {
        return current;
      }

      return null;
    });
  }, [groupRoutines]);

  if (groupRoutines.length === 0) return null;

  return (
    <div className="routine-group" data-muscle-group={muscleGroup} role="group" aria-label={`Rutinas de ${groupInfo.name}`}>
      <div>
        {isRecommended && <p className="mb-3 text-xs text-mint">Sugerida para hoy</p>}
        <div className="space-y-3">
          {groupRoutines.map((routine) => {
            const isExpanded = expandedRoutineId === routine.id;

            return (
              <div key={routine.id} className="routine-training-card">
                <div className="agenda-routine-heading">
                  <div className="min-w-0">
                    <h3 className="agenda-routine-title">{routine.name}</h3>
                    <div className="routine-meta">
                      <span>{formatCountLabel(routine.exercises.length, 'ejercicio', 'ejercicios')}</span>
                      <span>{formatCountLabel(routine.exercises.reduce((total, exercise) => total + exercise.sets, 0), 'serie', 'series')}</span>
                      {routine.isPublic && <span>Pública</span>}
                    </div>
                  </div>
                  <span className="agenda-routine-symbol" aria-hidden="true">
                    <MuscleGroupIcon muscleGroup={muscleGroup} size={17} />
                  </span>
                </div>
                <div className="agenda-routine-actions">
                  <div className="agenda-routine-secondary">
                    {routine.createdBy && routine.createdBy !== currentUser.id && (
                      <div className="agenda-routine-author" title={`Por ${routine.createdByName || 'Otro usuario'}`}>
                        {routine.createdByAvatarUrl ? (
                          <img src={routine.createdByAvatarUrl} alt="" referrerPolicy="no-referrer" />
                        ) : <Users size={13} aria-hidden="true" />}
                        <span>Por {routine.createdByName || 'Otro usuario'}</span>
                      </div>
                    )}
                    <button type="button" className="agenda-details" aria-expanded={isExpanded}
                      aria-label={isExpanded ? 'Ocultar ejercicios' : 'Ver ejercicios'}
                      aria-controls={`${detailsPrefix}-${routine.id}`}
                      onClick={() => setExpandedRoutineId((current) => current === routine.id ? null : routine.id)}>
                      {isExpanded ? 'Ocultar' : 'Ver ejercicios'}
                      {isExpanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                    </button>
                  </div>
                  <button type="button" className="routine-start" disabled={routine.exercises.length === 0}
                    aria-label={`Empezar ${routine.name}`} onClick={() => {
                      vibrateLight();
                      onStartWorkout(routine.id);
                    }}>
                    <Play size={15} aria-hidden="true" />Empezar
                  </button>
                </div>

                {isExpanded && (
                  <div id={`${detailsPrefix}-${routine.id}`} className="mt-3 rounded-xl bg-slateDeep/55 px-3 py-3">
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
                            <div className="text-xs text-slate-500">+{routine.exercises.length - 4} ejercicios más</div>
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
                            ? 'Puedes ajustar la clasificación sin salir de Inicio.'
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

interface MuscleGroupFilterProps {
  availableGroups: MuscleGroup[];
  routines: Routine[];
  selectedGroup: MuscleGroup | null;
  recommendedGroup?: MuscleGroup | null;
  onSelect: (group: MuscleGroup) => void;
}

// Keep focus/selection clear of the edge controls without scrolling the whole page.
const revealMuscleGroup = (rail: HTMLDivElement, button: HTMLButtonElement) => {
  const inset = rail.scrollWidth > rail.clientWidth + 2 ? 48 : 4;
  const left = button.offsetLeft;
  const right = left + button.offsetWidth;
  if (left < rail.scrollLeft + inset) rail.scrollLeft = Math.max(0, left - inset);
  else if (right > rail.scrollLeft + rail.clientWidth - inset) rail.scrollLeft = right - rail.clientWidth + inset;
};

const MuscleGroupFilter = ({ availableGroups, routines, selectedGroup, recommendedGroup, onSelect }: MuscleGroupFilterProps) => {
  const railRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ before: false, after: false });
  const hintId = useId();
  const overflowing = edges.before || edges.after;

  const updateEdges = () => {
    const rail = railRef.current;
    if (!rail) return;
    const before = rail.scrollLeft > 2;
    const after = rail.scrollWidth - rail.clientWidth - rail.scrollLeft > 2;
    setEdges((current) => current.before === before && current.after === after ? current : { before, after });
  };

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const revealSelection = () => {
      const selected = rail.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
      if (selected) revealMuscleGroup(rail, selected);
      updateEdges();
    };
    revealSelection();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(revealSelection);
    observer?.observe(rail);
    window.addEventListener('resize', revealSelection);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', revealSelection);
    };
  }, [selectedGroup, availableGroups]);

  const scrollGroups = (direction: number) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * rail.clientWidth * 0.7,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };

  return (
    <div className="muscle-filter">
      <div className="muscle-filter-caption">
        <span>Grupo muscular</span>
        {overflowing && <span id={hintId} className="muscle-filter-hint">Desliza para explorar <ChevronRight size={12} aria-hidden="true" /></span>}
      </div>
      <div className="muscle-filter-track" data-before={edges.before} data-after={edges.after}>
        <div className="routine-selector" ref={railRef} onScroll={updateEdges}
          role="group" aria-label="Filtrar rutinas por grupo muscular" aria-describedby={overflowing ? hintId : undefined}>
          {availableGroups.map((muscleGroup) => {
            const groupInfo = MUSCLE_GROUPS[muscleGroup];
            const routineCount = getRoutinesByMuscleGroup(routines, muscleGroup).length;
            return (
              <button key={muscleGroup} data-muscle-group={muscleGroup} type="button"
                onClick={() => onSelect(muscleGroup)} aria-pressed={selectedGroup === muscleGroup}
                onFocus={(event) => {
                  if (railRef.current && event.currentTarget.matches(':focus-visible')) {
                    revealMuscleGroup(railRef.current, event.currentTarget);
                  }
                  updateEdges();
                }}>
                <span aria-hidden="true"><MuscleGroupIcon muscleGroup={muscleGroup} size={15} /></span>
                <span>{groupInfo.name}</span>
                <span className="muscle-filter-count" aria-hidden="true">{routineCount}</span>
                <span className="sr-only">, {formatCountLabel(routineCount, 'rutina', 'rutinas')}</span>
                {muscleGroup === recommendedGroup && <span className="sr-only">Sugerencia de hoy</span>}
              </button>
            );
          })}
        </div>
        {edges.before && <button className="muscle-filter-edge muscle-filter-edge--before" type="button"
          aria-label="Ver grupos anteriores" onClick={() => scrollGroups(-1)}><ChevronLeft size={18} aria-hidden="true" /></button>}
        {edges.after && <button className="muscle-filter-edge muscle-filter-edge--after" type="button"
          aria-label="Ver más grupos musculares" onClick={() => scrollGroups(1)}><ChevronRight size={18} aria-hidden="true" /></button>}
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
      <div className="rounded-xl bg-slateDeep/45 px-4 py-8 text-center">
        <div className="font-display text-lg text-white">No hay rutinas todavía</div>
        <p className="mt-2 text-sm text-slate-400">Crea tu primera rutina para verla organizada por grupo muscular.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MuscleGroupFilter
        availableGroups={availableGroups}
        routines={routines}
        selectedGroup={selectedGroup}
        recommendedGroup={recommendedGroup}
        onSelect={setSelectedGroup}
      />

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
