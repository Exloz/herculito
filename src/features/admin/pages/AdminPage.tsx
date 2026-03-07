import React, { useMemo, useState } from 'react';
import { Activity, ArrowDownAZ, CheckCircle2, Clock3, Dumbbell, Filter, RefreshCw, Shield, Users, Weight } from 'lucide-react';
import { useAdminOverview } from '../hooks/useAdminOverview';
import { formatDateInAppTimeZone } from '../../../shared/lib/dateUtils';
import { PageSkeleton } from '../../../shared/ui/PageSkeleton';
import type { AdminRoutineOverview, AdminSessionOverview, AdminUserOverview, ExerciseLog, WorkoutSet } from '../../../shared/types';

const SESSION_PAGE_SIZE = 20;

const formatDateTime = (timestamp?: number): string => {
  if (!timestamp) return 'Sin actividad';
  return `${formatDateInAppTimeZone(new Date(timestamp))} ${new Date(timestamp).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit'
  })}`;
};

const formatDuration = (minutes?: number): string => {
  if (!minutes) return '-';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours} h ${remainingMinutes} min` : `${hours} h`;
};

const isWorkoutSet = (value: unknown): value is WorkoutSet => {
  const set = value as WorkoutSet;
  return typeof set?.setNumber === 'number' && typeof set?.weight === 'number' && typeof set?.completed === 'boolean';
};

const isExerciseLog = (value: unknown): value is ExerciseLog => {
  const log = value as ExerciseLog;
  return typeof log?.exerciseId === 'string' && Array.isArray(log?.sets) && log.sets.every(isWorkoutSet);
};

const getCompletedSetsCount = (sets: WorkoutSet[]): number => {
  return sets.filter((set) => set.completed).length;
};

const getTopWeight = (sets: WorkoutSet[]): number => {
  return sets.reduce((max, set) => Math.max(max, set.weight || 0), 0);
};

const getRoutineExerciseName = (
  routinesById: Map<string, AdminRoutineOverview>,
  routineId: string | undefined,
  exerciseId: string
): string => {
  if (!routineId) return exerciseId;
  const routine = routinesById.get(routineId);
  return routine?.exercises.find((exercise) => exercise.exerciseId === exerciseId)?.name ?? exerciseId;
};

const isWithinRange = (timestamp: number | undefined, range: string): boolean => {
  if (!timestamp || range === 'all') return true;

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const limitMs = range === '7d' ? 7 * dayMs : 30 * dayMs;
  return now - timestamp <= limitMs;
};

const compareUsers = (left: AdminUserOverview, right: AdminUserOverview, sortBy: string): number => {
  if (sortBy === 'name') {
    return (left.name || left.email || left.userId).localeCompare(right.name || right.email || right.userId, 'es');
  }
  if (sortBy === 'created') {
    return right.createdRoutines - left.createdRoutines;
  }
  if (sortBy === 'completed') {
    return right.completedSessions - left.completedSessions;
  }
  return (right.lastActivityAt ?? 0) - (left.lastActivityAt ?? 0);
};

const compareRoutines = (left: AdminRoutineOverview, right: AdminRoutineOverview, sortBy: string): number => {
  if (sortBy === 'name') {
    return left.name.localeCompare(right.name, 'es');
  }
  if (sortBy === 'lastCompleted') {
    return (right.lastCompletedAt ?? 0) - (left.lastCompletedAt ?? 0);
  }
  return right.timesUsed - left.timesUsed;
};

const compareSessions = (left: AdminSessionOverview, right: AdminSessionOverview, sortBy: string): number => {
  if (sortBy === 'duration') {
    return (right.totalDuration ?? 0) - (left.totalDuration ?? 0);
  }
  if (sortBy === 'user') {
    return (left.userName || left.userId).localeCompare(right.userName || right.userId, 'es');
  }
  return (right.completedAt ?? right.startedAt) - (left.completedAt ?? left.startedAt);
};

interface AdminPageProps {
  enabled: boolean;
}

export const AdminPage: React.FC<AdminPageProps> = ({ enabled }) => {
  const { data, loading, refreshing, error, refresh } = useAdminOverview(enabled);
  const [selectedUserId, setSelectedUserId] = useState('all');
  const [selectedRoutineId, setSelectedRoutineId] = useState('all');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d'>('30d');
  const [searchQuery, setSearchQuery] = useState('');
  const [userSort, setUserSort] = useState<'activity' | 'created' | 'completed' | 'name'>('activity');
  const [routineSort, setRoutineSort] = useState<'usage' | 'lastCompleted' | 'name'>('usage');
  const [sessionSort, setSessionSort] = useState<'recent' | 'duration' | 'user'>('recent');
  const [visibleSessions, setVisibleSessions] = useState(SESSION_PAGE_SIZE);
  const routinesById = useMemo(() => {
    return new Map((data?.routines ?? []).map((routine) => [routine.routineId, routine]));
  }, [data?.routines]);
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    return [...(data?.users ?? [])]
      .filter((user) => {
        if (!isWithinRange(user.lastActivityAt, dateRange)) return false;
        if (!normalizedQuery) return true;
        const haystack = [user.name, user.email, user.userId].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .sort((left, right) => compareUsers(left, right, userSort));
  }, [data?.users, dateRange, normalizedQuery, userSort]);

  const filteredRoutines = useMemo(() => {
    return [...(data?.routines ?? [])]
      .filter((routine) => {
        if (selectedUserId !== 'all' && routine.createdBy !== selectedUserId) return false;
        if (!isWithinRange(routine.lastCompletedAt, dateRange)) return false;
        if (!normalizedQuery) return true;
        const exerciseNames = routine.exercises.map((exercise) => exercise.name).join(' ');
        const haystack = [routine.name, routine.createdByName, routine.createdBy, exerciseNames].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .sort((left, right) => compareRoutines(left, right, routineSort));
  }, [data?.routines, dateRange, normalizedQuery, routineSort, selectedUserId]);

  const filteredSessions = useMemo(() => {
    return [...(data?.sessions ?? [])]
      .filter((session) => {
        if (selectedUserId !== 'all' && session.userId !== selectedUserId) return false;
        if (selectedRoutineId !== 'all' && session.routineId !== selectedRoutineId) return false;
        if (!isWithinRange(session.completedAt ?? session.startedAt, dateRange)) return false;
        if (!normalizedQuery) return true;
        const haystack = [session.userName, session.userId, session.routineName].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .sort((left, right) => compareSessions(left, right, sessionSort));
  }, [data?.sessions, dateRange, normalizedQuery, selectedRoutineId, selectedUserId, sessionSort]);

  const visibleFilteredSessions = useMemo(() => {
    return filteredSessions.slice(0, visibleSessions);
  }, [filteredSessions, visibleSessions]);

  const userOptions = useMemo(() => {
    return data?.users ?? [];
  }, [data?.users]);

  const routineOptions = useMemo(() => {
    return data?.routines ?? [];
  }, [data?.routines]);

  if (loading) {
    return <PageSkeleton page="dashboard" />;
  }

  if (!enabled) {
    return null;
  }

  return (
    <div className="app-shell pb-28">
      <header className="app-header px-4 pb-5 pt-[calc(0.25rem+env(safe-area-inset-top))] sm:pb-6 sm:pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-4">
          <div>
            <div className="chip mb-3 inline-flex items-center gap-2">
              <Shield size={14} />
              ADMIN
            </div>
            <h1 className="text-2xl font-display text-white sm:text-3xl">Panel de administracion</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Vista global de usuarios, rutinas y sesiones realizadas en la plataforma.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            className="btn-secondary inline-flex items-center gap-2 disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:py-8">
        {error && (
          <div className="rounded-2xl border border-crimson/40 bg-crimson/10 px-4 py-3 text-sm text-crimson">
            {error}
          </div>
        )}

        <section className="relative overflow-hidden rounded-[1.75rem] border border-mint/15 bg-[radial-gradient(circle_at_top_left,rgba(72,229,163,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,191,71,0.16),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.94))] p-4 shadow-soft sm:p-5">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.03)_25%,transparent_50%)]" aria-hidden="true" />
          <div className="relative">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-mint/80">
              <Filter size={14} /> Centro de control
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]">
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Busqueda</span>
                <input
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setVisibleSessions(SESSION_PAGE_SIZE);
                  }}
                  placeholder="Usuario, rutina o ejercicio"
                  className="input h-12 w-full bg-white/[0.04]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Usuario</span>
                <select
                  value={selectedUserId}
                  onChange={(event) => {
                    setSelectedUserId(event.target.value);
                    setVisibleSessions(SESSION_PAGE_SIZE);
                  }}
                  className="input h-12 w-full bg-white/[0.04]"
                >
                  <option value="all">Todos</option>
                  {userOptions.map((user) => (
                    <option key={user.userId} value={user.userId}>{user.name || user.email || user.userId}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Rutina</span>
                <select
                  value={selectedRoutineId}
                  onChange={(event) => {
                    setSelectedRoutineId(event.target.value);
                    setVisibleSessions(SESSION_PAGE_SIZE);
                  }}
                  className="input h-12 w-full bg-white/[0.04]"
                >
                  <option value="all">Todas</option>
                  {routineOptions.map((routine) => (
                    <option key={routine.routineId} value={routine.routineId}>{routine.name}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Ventana</span>
                <select
                  value={dateRange}
                  onChange={(event) => {
                    setDateRange(event.target.value as 'all' | '7d' | '30d');
                    setVisibleSessions(SESSION_PAGE_SIZE);
                  }}
                  className="input h-12 w-full bg-white/[0.04]"
                >
                  <option value="7d">Ultimos 7 dias</option>
                  <option value="30d">Ultimos 30 dias</option>
                  <option value="all">Historico</option>
                </select>
              </label>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedUserId('all');
                  setSelectedRoutineId('all');
                  setDateRange('30d');
                  setUserSort('activity');
                  setRoutineSort('usage');
                  setSessionSort('recent');
                  setVisibleSessions(SESSION_PAGE_SIZE);
                }}
                className="btn-secondary mt-[1.45rem] inline-flex h-12 items-center justify-center gap-2"
              >
                <ArrowDownAZ size={16} /> Reiniciar
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Usuarios visibles</div>
                <div className="mt-1 text-xl font-display text-white">{filteredUsers.length}</div>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Rutinas visibles</div>
                <div className="mt-1 text-xl font-display text-white">{filteredRoutines.length}</div>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Sesiones visibles</div>
                <div className="mt-1 text-xl font-display text-white">{filteredSessions.length}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="app-card p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-300"><Users size={16} /> Usuarios</div>
            <div className="text-2xl font-display text-white">{data?.summary.totalUsers ?? 0}</div>
          </div>
          <div className="app-card p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-300"><Dumbbell size={16} /> Rutinas</div>
            <div className="text-2xl font-display text-white">{data?.summary.totalRoutines ?? 0}</div>
          </div>
          <div className="app-card p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-300"><Activity size={16} /> Realizadas</div>
            <div className="text-2xl font-display text-white">{data?.summary.totalCompletedSessions ?? 0}</div>
          </div>
          <div className="app-card p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-300"><Clock3 size={16} /> Promedio</div>
            <div className="text-2xl font-display text-white">{formatDuration(data?.summary.averageDurationMin)}</div>
          </div>
        </section>

        <section className="app-card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-display text-white">Usuarios</h2>
              <p className="text-sm text-slate-400">Perfiles y actividad agregada.</p>
            </div>
            <div className="flex items-center gap-2">
              <select value={userSort} onChange={(event) => setUserSort(event.target.value as typeof userSort)} className="input input-sm bg-white/[0.03] text-sm">
                <option value="activity">Mas activos</option>
                <option value="completed">Mas entrenan</option>
                <option value="created">Mas crean</option>
                <option value="name">Nombre</option>
              </select>
              <div className="chip">{filteredUsers.length}</div>
            </div>
          </div>

          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div key={user.userId} className="app-surface p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-white">{user.name || user.email || user.userId}</div>
                    <div className="mt-1 break-all text-sm text-slate-400">{user.email || 'Sin email'}</div>
                    <div className="mt-1 break-all text-xs text-slate-500">{user.userId}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:min-w-[360px]">
                    <div className="app-surface-muted p-3 text-center">
                      <div className="text-lg font-display text-white">{user.createdRoutines}</div>
                      <div className="text-[11px] text-slate-400">rutinas creadas</div>
                    </div>
                    <div className="app-surface-muted p-3 text-center">
                      <div className="text-lg font-display text-white">{user.completedSessions}</div>
                      <div className="text-[11px] text-slate-400">rutinas realizadas</div>
                    </div>
                    <div className="app-surface-muted col-span-2 p-3 text-center sm:col-span-1">
                      <div className="text-sm font-semibold text-white">{formatDateTime(user.lastActivityAt)}</div>
                      <div className="text-[11px] text-slate-400">ultima actividad</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="app-card p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-display text-white">Rutinas</h2>
                <p className="text-sm text-slate-400">Creacion, uso y ejercicios configurados.</p>
              </div>
              <div className="flex items-center gap-2">
                <select value={routineSort} onChange={(event) => setRoutineSort(event.target.value as typeof routineSort)} className="input input-sm bg-white/[0.03] text-sm">
                  <option value="usage">Mas usadas</option>
                  <option value="lastCompleted">Mas recientes</option>
                  <option value="name">Nombre</option>
                </select>
                <div className="chip">{filteredRoutines.length}</div>
              </div>
            </div>

            <div className="space-y-3">
              {filteredRoutines.map((routine) => (
                <details key={routine.routineId} className="app-surface overflow-hidden p-4">
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-white">{routine.name}</div>
                        <div className="mt-1 text-sm text-slate-400">
                          Creador: {routine.createdByName || routine.createdBy}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:min-w-[220px]">
                        <div className="app-surface-muted p-3 text-center">
                          <div className="text-lg font-display text-white">{routine.timesUsed}</div>
                          <div className="text-[11px] text-slate-400">veces usada</div>
                        </div>
                        <div className="app-surface-muted p-3 text-center">
                          <div className="text-sm font-semibold text-white">{formatDateTime(routine.lastCompletedAt)}</div>
                          <div className="text-[11px] text-slate-400">ultima vez</div>
                        </div>
                      </div>
                    </div>
                  </summary>

                  <div className="mt-4 space-y-2 border-t border-mist/30 pt-4">
                    {routine.exercises.map((exercise) => (
                      <div key={`${routine.routineId}-${exercise.exerciseId}`} className="app-surface-muted flex items-center justify-between gap-3 p-3 text-sm">
                        <div className="min-w-0 text-white">{exercise.name}</div>
                        <div className="shrink-0 text-slate-400">
                          {exercise.sets}x{exercise.reps}{exercise.restTime ? ` - ${exercise.restTime}s` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>

          <div className="app-card p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-display text-white">Sesiones completadas</h2>
                <p className="text-sm text-slate-400">Ultimas 500 sesiones con detalle de ejercicios.</p>
              </div>
              <div className="flex items-center gap-2">
                <select value={sessionSort} onChange={(event) => setSessionSort(event.target.value as typeof sessionSort)} className="input input-sm bg-white/[0.03] text-sm">
                  <option value="recent">Mas recientes</option>
                  <option value="duration">Mas largas</option>
                  <option value="user">Usuario</option>
                </select>
                <div className="chip">{filteredSessions.length}</div>
              </div>
            </div>

            <div className="space-y-3">
              {visibleFilteredSessions.map((session) => (
                <details key={session.sessionId} className="app-surface overflow-hidden p-4">
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-base font-semibold text-white">{session.routineName}</div>
                        <div className="text-sm font-semibold text-mint">{formatDuration(session.totalDuration)}</div>
                      </div>
                      <div className="text-sm text-slate-300">Usuario: {session.userName || session.userId}</div>
                      <div className="text-xs text-slate-500">
                        Inicio: {formatDateTime(session.startedAt)} - Fin: {formatDateTime(session.completedAt)}
                      </div>
                    </div>
                  </summary>

                  <div className="mt-4 border-t border-mist/30 pt-4">
                    {session.exercises.length > 0 ? (
                      <div className="space-y-3">
                        {session.exercises.filter(isExerciseLog).map((exerciseLog) => {
                          const completedSets = getCompletedSetsCount(exerciseLog.sets);
                          const topWeight = getTopWeight(exerciseLog.sets);
                          const exerciseName = getRoutineExerciseName(routinesById, session.routineId, exerciseLog.exerciseId);

                          return (
                            <div key={`${session.sessionId}-${exerciseLog.exerciseId}`} className="overflow-hidden rounded-2xl border border-mist/20 bg-ink/40">
                              <div className="flex flex-col gap-3 border-b border-mist/20 bg-gradient-to-r from-mint/10 via-transparent to-amberGlow/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-mint/80">Ejercicio</div>
                                  <div className="mt-1 text-base font-semibold text-white">{exerciseName}</div>
                                  <div className="mt-1 break-all text-xs text-slate-500">{exerciseLog.exerciseId}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 sm:min-w-[280px] sm:grid-cols-3">
                                  <div className="rounded-xl bg-white/[0.03] px-3 py-2 text-center">
                                    <div className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wide text-slate-400">
                                      <CheckCircle2 size={12} /> Completadas
                                    </div>
                                    <div className="mt-1 text-base font-display text-white">{completedSets}/{exerciseLog.sets.length}</div>
                                  </div>
                                  <div className="rounded-xl bg-white/[0.03] px-3 py-2 text-center">
                                    <div className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wide text-slate-400">
                                      <Weight size={12} /> Carga top
                                    </div>
                                    <div className="mt-1 text-base font-display text-white">{topWeight > 0 ? `${topWeight} kg` : '-'}</div>
                                  </div>
                                  <div className="rounded-xl bg-white/[0.03] px-3 py-2 text-center col-span-2 sm:col-span-1">
                                    <div className="text-[11px] uppercase tracking-wide text-slate-400">Fecha log</div>
                                    <div className="mt-1 text-sm font-semibold text-white">{exerciseLog.date || '-'}</div>
                                  </div>
                                </div>
                              </div>

                              <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
                                {exerciseLog.sets.map((set) => (
                                  <div
                                    key={`${session.sessionId}-${exerciseLog.exerciseId}-${set.setNumber}`}
                                    className={`rounded-xl border px-3 py-3 transition-colors ${set.completed ? 'border-mint/30 bg-mint/10' : 'border-mist/20 bg-white/[0.02]'}`}
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="text-sm font-semibold text-white">Serie {set.setNumber}</div>
                                      <div className={`rounded-full px-2 py-1 text-[11px] font-semibold ${set.completed ? 'bg-mint/15 text-mint' : 'bg-slateDeep/70 text-slate-300'}`}>
                                        {set.completed ? 'Hecha' : 'Pendiente'}
                                      </div>
                                    </div>
                                    <div className="mt-3 flex items-end justify-between gap-3">
                                      <div>
                                        <div className="text-[11px] uppercase tracking-wide text-slate-500">Peso</div>
                                        <div className="text-lg font-display text-white">{set.weight > 0 ? `${set.weight} kg` : '-'}</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-[11px] uppercase tracking-wide text-slate-500">Registro</div>
                                        <div className="text-xs text-slate-300">
                                          {set.completedAt instanceof Date ? formatDateTime(set.completedAt.getTime()) : 'Sin hora'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-400">Sin detalle de ejercicios.</div>
                    )}
                  </div>
                </details>
              ))}

              {filteredSessions.length > visibleFilteredSessions.length && (
                <button
                  type="button"
                  onClick={() => setVisibleSessions((current) => current + SESSION_PAGE_SIZE)}
                  className="btn-secondary w-full"
                >
                  Mostrar {Math.min(SESSION_PAGE_SIZE, filteredSessions.length - visibleFilteredSessions.length)} sesiones mas
                </button>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
