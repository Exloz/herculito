import React from 'react';
import { CheckCircle2, ChevronDown, Weight } from 'lucide-react';
import type { AdminRoutineOverview, AdminUserOverview } from '../../../shared/types';
import { Sparkline, SectionAccordion } from './AdminShared';
import {
  formatDateTime,
  formatDuration,
  formatWeight,
  formatWeightDelta,
  type AdminUserSort,
  type UserActivitySummary
} from '../lib/adminPage';

interface AdminUsersSectionProps {
  users: AdminUserOverview[];
  routines: AdminRoutineOverview[];
  selectedUserId: string;
  userSort: AdminUserSort;
  areAllUsersExpanded: boolean;
  userDisplayNameById: Map<string, string>;
  userActivityById: Map<string, UserActivitySummary>;
  openUserIds: Set<string>;
  onUserSortChange: (value: AdminUserSort) => void;
  onToggleAllUsers: () => void;
  onToggleUser: (userId: string, open: boolean) => void;
  onResetFilters: () => void;
}

export const AdminUsersSection: React.FC<AdminUsersSectionProps> = ({
  users,
  routines,
  selectedUserId,
  userSort,
  areAllUsersExpanded,
  userDisplayNameById,
  userActivityById,
  openUserIds,
  onUserSortChange,
  onToggleAllUsers,
  onToggleUser,
  onResetFilters
}) => {
  return (
    <SectionAccordion
      title="Usuarios"
      subtitle="Cada usuario agrupa su actividad, rutinas realizadas y ejercicios ejecutados."
      badge={<div className="chip">{users.length}</div>}
      defaultOpen
    >
      <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-400 sm:text-sm">Vista principal por usuario.</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button type="button" onClick={onToggleAllUsers} className="btn-secondary h-10 px-3 text-sm">
            {areAllUsersExpanded ? 'Colapsar todos' : 'Expandir todos'}
          </button>
          <select value={userSort} onChange={(event) => onUserSortChange(event.target.value as AdminUserSort)} className="input input-sm h-10 bg-white/[0.03] text-sm sm:w-auto">
            <option value="activity">Mas activos</option>
            <option value="completed">Mas entrenan</option>
            <option value="created">Mas crean</option>
            <option value="name">Nombre</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {users.length === 0 && (
          <div className="rounded-2xl border border-dashed border-mist/25 bg-white/[0.02] px-4 py-6 text-sm text-slate-400">
            <p>No hay usuarios que coincidan con los filtros actuales.</p>
            <button type="button" onClick={onResetFilters} className="btn-secondary mt-3 text-sm">
              Reiniciar filtros
            </button>
          </div>
        )}

        {users.map((user) => {
          const activity = userActivityById.get(user.userId);
          const createdRoutines = routines.filter((routine) => routine.createdBy === user.userId);
          const displayName = userDisplayNameById.get(user.userId) ?? 'Usuario sin nombre';
          const subtitle = user.email && user.email !== displayName ? user.email : 'Sin email visible';

          return (
            <details
              key={user.userId}
              className="group overflow-hidden rounded-[1.15rem] border border-mist/20 bg-[linear-gradient(180deg,rgba(20,26,39,0.94),rgba(9,14,25,0.94))] shadow-soft"
              open={openUserIds.has(user.userId) || selectedUserId === user.userId}
              onToggle={(event) => onToggleUser(user.userId, event.currentTarget.open)}
            >
              <summary className="flex cursor-pointer list-none flex-col gap-3 px-4 py-3 sm:px-4 sm:py-3.5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-full border border-mint/20 bg-mint/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-mint/80">
                      Usuario
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-400">
                      Última actividad: {formatDateTime(activity?.lastCompletedAt ?? user.lastActivityAt)}
                    </div>
                  </div>

                  <div dir="auto" className="mt-2 break-words text-lg font-display text-white sm:text-xl" style={{ overflowWrap: 'anywhere' }}>{displayName}</div>
                  <div dir="auto" className="mt-1 break-words text-sm text-slate-400" style={{ overflowWrap: 'anywhere' }}>{subtitle}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[440px]">
                  <div className="rounded-xl border border-white/5 bg-white/[0.03] px-2.5 py-2 text-center">
                    <div className="text-base font-display text-white">{user.createdRoutines}</div>
                    <div className="text-[11px] text-slate-400">creadas</div>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/[0.03] px-2.5 py-2 text-center">
                    <div className="text-base font-display text-white">{activity?.totalSessions ?? user.completedSessions}</div>
                    <div className="text-[11px] text-slate-400">realizadas</div>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/[0.03] px-2.5 py-2 text-center">
                    <div className="text-base font-display text-white">{formatDuration(activity ? Math.round(activity.totalDuration / Math.max(activity.totalSessions, 1)) : undefined)}</div>
                    <div className="text-[11px] text-slate-400">promedio</div>
                  </div>
                  <div className="flex items-center justify-center rounded-xl border border-white/5 bg-white/[0.03] px-2.5 py-2 text-slate-300 transition group-open:rotate-180">
                    <ChevronDown size={18} />
                  </div>
                </div>
              </summary>

              <div className="border-t border-mist/20 px-4 py-3 sm:px-4 sm:py-4">
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.9fr)]">
                  <div>
                    <div className="mb-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 sm:text-sm">Rutinas realizadas</div>
                    {activity?.routines.length ? (
                      <div className="space-y-2.5">
                        {activity.routines.map((routine) => (
                          <details key={`${user.userId}-${routine.routineId ?? routine.routineName}`} className="group/routine overflow-hidden rounded-xl border border-mist/20 bg-white/[0.03]">
                            <summary className="flex cursor-pointer list-none flex-col gap-2.5 px-3 py-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <div className="text-sm font-semibold text-white sm:text-base">{routine.routineName}</div>
                                <div className="mt-1 text-xs text-slate-400">Última vez: {formatDateTime(routine.lastCompletedAt)}</div>
                              </div>

                              <div className="grid grid-cols-3 gap-1.5 sm:min-w-[280px]">
                                <div className="rounded-lg bg-ink/40 px-2 py-1.5 text-center">
                                  <div className="text-base font-display text-white">{routine.sessionCount}</div>
                                  <div className="text-[11px] text-slate-400">sesiones</div>
                                </div>
                                <div className="rounded-lg bg-ink/40 px-2 py-1.5 text-center">
                                  <div className="text-base font-display text-white">{formatDuration(Math.round(routine.totalDuration / Math.max(routine.sessionCount, 1)))}</div>
                                  <div className="text-[11px] text-slate-400">promedio</div>
                                </div>
                                <div className="flex items-center justify-center rounded-lg bg-ink/40 px-2 py-1.5 text-slate-300 transition group-open/routine:rotate-180">
                                  <ChevronDown size={16} />
                                </div>
                              </div>
                            </summary>

                            <div className="border-t border-mist/20 p-3">
                              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                                {routine.exercises.map((exercise) => (
                                  <div key={`${user.userId}-${routine.routineName}-${exercise.exerciseId}`} className="rounded-xl border border-white/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-3">
                                    <div className="text-sm font-semibold text-white">{exercise.exerciseName}</div>
                                    <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">Actividad agregada</div>

                                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                                      {exercise.targetSets !== undefined && exercise.targetReps !== undefined && (
                                        <div className="rounded-full border border-mint/20 bg-mint/10 px-2 py-1 text-mint/90">
                                          Objetivo: {exercise.targetSets}x{exercise.targetReps}
                                        </div>
                                      )}
                                      {exercise.targetReps !== undefined && (
                                        <div className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-slate-300">
                                          Reps completadas aprox.: {exercise.completedSets * exercise.targetReps}
                                        </div>
                                      )}
                                    </div>

                                    <div className="mt-3 grid grid-cols-2 gap-1.5">
                                      <div className="rounded-lg bg-ink/45 px-2.5 py-2">
                                        <div className="text-[11px] uppercase tracking-wide text-slate-400">Sesiones</div>
                                        <div className="mt-1 text-base font-display text-white">{exercise.sessionCount}</div>
                                      </div>
                                      <div className="rounded-lg bg-ink/45 px-2.5 py-2">
                                        <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-slate-400">
                                          <CheckCircle2 size={12} /> Series
                                        </div>
                                        <div className="mt-1 text-base font-display text-white">{exercise.completedSets}/{exercise.totalLoggedSets}</div>
                                      </div>
                                      <div className="rounded-lg bg-ink/45 px-2.5 py-2">
                                        <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-slate-400">
                                          <Weight size={12} /> PR
                                        </div>
                                        <div className="mt-1 text-base font-display text-white">{formatWeight(exercise.topWeight)}</div>
                                      </div>
                                      <div className="rounded-lg bg-ink/45 px-2.5 py-2">
                                        <div className="text-[11px] uppercase tracking-wide text-slate-400">Última carga</div>
                                        <div className="mt-1 text-base font-display text-white">{formatWeight(exercise.latestTopWeight)}</div>
                                      </div>
                                    </div>

                                    <div className="mt-2.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
                                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Evolucion</div>
                                      <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                                        <div>
                                          <div className="text-slate-400">Primera carga</div>
                                          <div className="font-semibold text-white">{formatWeight(exercise.firstTopWeight)}</div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-slate-400">Cambio</div>
                                          <div className={`font-semibold ${exercise.latestTopWeight > exercise.firstTopWeight ? 'text-mint' : exercise.latestTopWeight < exercise.firstTopWeight ? 'text-amberGlow' : 'text-white'}`}>
                                            {formatWeightDelta(exercise.latestTopWeight, exercise.firstTopWeight)}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="mt-2 rounded-lg border border-mint/10 bg-[linear-gradient(180deg,rgba(72,229,163,0.08),rgba(72,229,163,0.02))] px-2 py-2">
                                        <Sparkline points={exercise.history} />
                                        <div className="mt-1 flex items-center justify-between px-1 text-[11px] text-slate-400">
                                          <span>{exercise.firstPerformedAt ? new Date(exercise.firstPerformedAt).toLocaleDateString('es-CO') : 'Inicio'}</span>
                                          <span>{exercise.lastPerformedAt ? new Date(exercise.lastPerformedAt).toLocaleDateString('es-CO') : 'Actual'}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-3 text-xs text-slate-400">Última ejecución: {formatDateTime(exercise.lastPerformedAt)}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </details>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-mist/25 bg-white/[0.02] px-4 py-6 text-sm text-slate-400">
                        No hay actividad registrada para este usuario en el filtro actual.
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-xl border border-mist/20 bg-white/[0.03] p-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 sm:text-sm">Resumen rápido</div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-ink/40 px-2.5 py-2.5 text-center">
                          <div className="text-base font-display text-white">{activity?.routines.length ?? 0}</div>
                          <div className="text-[11px] text-slate-400">rutinas realizadas</div>
                        </div>
                        <div className="rounded-lg bg-ink/40 px-2.5 py-2.5 text-center">
                          <div className="text-base font-display text-white">{formatDuration(activity?.totalDuration)}</div>
                          <div className="text-[11px] text-slate-400">tiempo acumulado</div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-mist/20 bg-white/[0.03] p-3">
                      <div className="mb-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 sm:text-sm">Rutinas creadas</div>
                      {createdRoutines.length ? (
                        <div className="space-y-2">
                          {createdRoutines.map((routine) => (
                            <div key={`${user.userId}-${routine.routineId}-created`} className="rounded-lg bg-ink/40 px-3 py-2.5">
                              <div className="text-sm font-semibold text-white">{routine.name}</div>
                              <div className="mt-1 text-xs text-slate-400">{routine.exercises.length} ejercicios - {routine.timesUsed} usos</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-400">No ha creado rutinas visibles.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </SectionAccordion>
  );
};
