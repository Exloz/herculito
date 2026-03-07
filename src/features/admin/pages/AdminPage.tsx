import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowDownAZ,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Dumbbell,
  Filter,
  RefreshCw,
  Shield,
  Users,
  Weight
} from 'lucide-react';
import { useAdminOverview } from '../hooks/useAdminOverview';
import { formatDateInAppTimeZone } from '../../../shared/lib/dateUtils';
import { PageSkeleton } from '../../../shared/ui/PageSkeleton';
import type {
  AdminRoutineOverview,
  AdminSessionOverview,
  AdminUserOverview,
  ExerciseLog,
  WorkoutSet
} from '../../../shared/types';

const SESSION_PAGE_SIZE = 20;

interface AdminPageProps {
  enabled: boolean;
}

interface AggregatedExerciseActivity {
  exerciseId: string;
  exerciseName: string;
  completedSets: number;
  totalLoggedSets: number;
  topWeight: number;
  lastPerformedAt?: number;
}

interface AggregatedRoutineActivity {
  routineId?: string;
  routineName: string;
  sessionCount: number;
  totalDuration: number;
  lastCompletedAt?: number;
  exercises: AggregatedExerciseActivity[];
}

interface UserActivitySummary {
  sampleUserName?: string;
  totalSessions: number;
  totalDuration: number;
  lastCompletedAt?: number;
  routines: AggregatedRoutineActivity[];
}

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

const isWithinRange = (timestamp: number | undefined, range: string): boolean => {
  if (!timestamp || range === 'all') return true;

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const limitMs = range === '7d' ? 7 * dayMs : 30 * dayMs;
  return now - timestamp <= limitMs;
};

const looksLikeId = (value?: string): boolean => {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.includes('@')) return false;
  if (trimmed.includes(' ')) return false;
  return /^user_[A-Za-z0-9]+$/.test(trimmed) || /^[A-Za-z0-9_-]{18,}$/.test(trimmed);
};

const isMeaningfulUserLabel = (value?: string): boolean => {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (looksLikeId(trimmed)) return false;
  return trimmed.toLowerCase() !== 'usuario';
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

const compareUsers = (left: AdminUserOverview, right: AdminUserOverview, sortBy: string): number => {
  if (sortBy === 'name') {
    return (left.name || left.email || '').localeCompare(right.name || right.email || '', 'es');
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

const SectionAccordion = ({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  children
}: {
  title: string;
  subtitle: string;
  badge: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  return (
    <details open={defaultOpen} className="group app-card overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-lg font-display text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {badge}
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-mist/30 bg-white/[0.03] text-slate-300 transition group-open:rotate-180">
            <ChevronDown size={18} />
          </div>
        </div>
      </summary>

      <div className="border-t border-mist/30 px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </details>
  );
};

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

  const creatorNameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    (data?.routines ?? []).forEach((routine) => {
      if (isMeaningfulUserLabel(routine.createdByName) && !map.has(routine.createdBy)) {
        map.set(routine.createdBy, routine.createdByName!.trim());
      }
    });
    return map;
  }, [data?.routines]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredSessions = useMemo(() => {
    return [...(data?.sessions ?? [])]
      .filter((session) => {
        if (selectedUserId !== 'all' && session.userId !== selectedUserId) return false;
        if (selectedRoutineId !== 'all' && session.routineId !== selectedRoutineId) return false;
        if (!isWithinRange(session.completedAt ?? session.startedAt, dateRange)) return false;
        if (!normalizedQuery) return true;

        const routine = session.routineId ? routinesById.get(session.routineId) : undefined;
        const routineExercises = routine?.exercises.map((exercise) => exercise.name).join(' ') ?? '';
        const haystack = [session.userName, session.routineName, routineExercises]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .sort((left, right) => compareSessions(left, right, sessionSort));
  }, [data?.sessions, dateRange, normalizedQuery, routinesById, selectedRoutineId, selectedUserId, sessionSort]);

  const userActivityById = useMemo(() => {
    const map = new Map<string, UserActivitySummary>();

    filteredSessions.forEach((session) => {
      const current = map.get(session.userId) ?? {
        totalSessions: 0,
        totalDuration: 0,
        lastCompletedAt: undefined,
        sampleUserName: undefined,
        routines: []
      };

      current.totalSessions += 1;
      current.totalDuration += session.totalDuration ?? 0;
      current.lastCompletedAt = Math.max(current.lastCompletedAt ?? 0, session.completedAt ?? session.startedAt);
      if (isMeaningfulUserLabel(session.userName) && !current.sampleUserName) {
        current.sampleUserName = session.userName;
      }

      const routineKey = session.routineId ?? session.routineName;
      let routine = current.routines.find((entry) => (entry.routineId ?? entry.routineName) === routineKey);
      if (!routine) {
        routine = {
          routineId: session.routineId,
          routineName: session.routineName,
          sessionCount: 0,
          totalDuration: 0,
          lastCompletedAt: undefined,
          exercises: []
        };
        current.routines.push(routine);
      }

      routine.sessionCount += 1;
      routine.totalDuration += session.totalDuration ?? 0;
      routine.lastCompletedAt = Math.max(routine.lastCompletedAt ?? 0, session.completedAt ?? session.startedAt);

      session.exercises.filter(isExerciseLog).forEach((exerciseLog) => {
        const exerciseName = getRoutineExerciseName(routinesById, session.routineId, exerciseLog.exerciseId);
        let exercise = routine!.exercises.find((entry) => entry.exerciseId === exerciseLog.exerciseId);
        if (!exercise) {
          exercise = {
            exerciseId: exerciseLog.exerciseId,
            exerciseName,
            completedSets: 0,
            totalLoggedSets: 0,
            topWeight: 0,
            lastPerformedAt: undefined
          };
          routine!.exercises.push(exercise);
        }

        exercise.completedSets += getCompletedSetsCount(exerciseLog.sets);
        exercise.totalLoggedSets += exerciseLog.sets.length;
        exercise.topWeight = Math.max(exercise.topWeight, getTopWeight(exerciseLog.sets));

        exerciseLog.sets.forEach((set) => {
          if (set.completedAt instanceof Date) {
            exercise!.lastPerformedAt = Math.max(exercise!.lastPerformedAt ?? 0, set.completedAt.getTime());
          }
        });
      });

      map.set(session.userId, current);
    });

    map.forEach((summary) => {
      summary.routines.sort((left, right) => (right.lastCompletedAt ?? 0) - (left.lastCompletedAt ?? 0));
      summary.routines.forEach((routine) => {
        routine.exercises.sort((left, right) => (right.lastPerformedAt ?? 0) - (left.lastPerformedAt ?? 0));
      });
    });

    return map;
  }, [filteredSessions, routinesById]);

  const userDisplayNameById = useMemo(() => {
    const map = new Map<string, string>();

    (data?.users ?? []).forEach((user) => {
      let label = 'Usuario sin nombre';
      if (isMeaningfulUserLabel(user.name)) {
        label = user.name!.trim();
      } else if (isMeaningfulUserLabel(userActivityById.get(user.userId)?.sampleUserName)) {
        label = userActivityById.get(user.userId)!.sampleUserName!.trim();
      } else if (isMeaningfulUserLabel(creatorNameByUserId.get(user.userId))) {
        label = creatorNameByUserId.get(user.userId)!.trim();
      } else if (user.email?.trim()) {
        label = user.email.trim();
      }

      map.set(user.userId, label);
    });

    return map;
  }, [creatorNameByUserId, data?.users, userActivityById]);

  const filteredUsers = useMemo(() => {
    return [...(data?.users ?? [])]
      .filter((user) => {
        if (selectedUserId !== 'all' && user.userId !== selectedUserId) return false;

        const activity = userActivityById.get(user.userId);
        if (selectedRoutineId !== 'all' && !activity?.routines.some((routine) => routine.routineId === selectedRoutineId)) {
          return false;
        }

        if (!isWithinRange(activity?.lastCompletedAt ?? user.lastActivityAt, dateRange)) return false;

        if (!normalizedQuery) return true;

        const activityText = activity?.routines
          .flatMap((routine) => [routine.routineName, ...routine.exercises.map((exercise) => exercise.exerciseName)])
          .join(' ') ?? '';
        const haystack = [userDisplayNameById.get(user.userId), user.email, activityText]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .sort((left, right) => compareUsers(left, right, userSort));
  }, [data?.users, dateRange, normalizedQuery, selectedRoutineId, selectedUserId, userActivityById, userDisplayNameById, userSort]);

  const filteredRoutines = useMemo(() => {
    return [...(data?.routines ?? [])]
      .filter((routine) => {
        if (selectedUserId !== 'all' && routine.createdBy !== selectedUserId) return false;
        if (selectedRoutineId !== 'all' && routine.routineId !== selectedRoutineId) return false;
        if (!isWithinRange(routine.lastCompletedAt, dateRange)) return false;
        if (!normalizedQuery) return true;

        const exerciseNames = routine.exercises.map((exercise) => exercise.name).join(' ');
        const haystack = [routine.name, routine.createdByName, exerciseNames]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .sort((left, right) => compareRoutines(left, right, routineSort));
  }, [data?.routines, dateRange, normalizedQuery, routineSort, selectedRoutineId, selectedUserId]);

  const visibleFilteredSessions = useMemo(() => {
    return filteredSessions.slice(0, visibleSessions);
  }, [filteredSessions, visibleSessions]);

  const userOptions = (data?.users ?? []).map((user) => ({ value: user.userId, label: userDisplayNameById.get(user.userId) ?? 'Usuario sin nombre' }));

  const routineOptions = data?.routines ?? [];

  if (loading) {
    return <PageSkeleton page="dashboard" />;
  }

  if (!enabled) {
    return null;
  }

  return (
    <div className="app-shell pb-28">
      <header className="app-header px-4 pb-5 pt-[calc(0.25rem+env(safe-area-inset-top))] sm:pb-6 sm:pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="chip mb-3 inline-flex items-center gap-2">
              <Shield size={14} />
              ADMIN
            </div>
            <h1 className="text-2xl font-display text-white sm:text-3xl">Panel de administracion</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Revision operativa de usuarios, rutinas y actividad real de entrenamiento.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            className="btn-secondary inline-flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap sm:w-auto disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Actualizando' : 'Actualizar datos'}</span>
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
                    <option key={user.value} value={user.value}>{user.label}</option>
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
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Actividad visible</div>
                <div className="mt-1 text-xl font-display text-white">{filteredSessions.length} sesiones</div>
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

        <SectionAccordion
          title="Usuarios"
          subtitle="Cada usuario agrupa su actividad, rutinas realizadas y ejercicios ejecutados."
          badge={<div className="chip">{filteredUsers.length}</div>}
          defaultOpen
        >
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">Vista principal de auditoria por usuario.</p>
            <select value={userSort} onChange={(event) => setUserSort(event.target.value as typeof userSort)} className="input input-sm bg-white/[0.03] text-sm sm:w-auto">
              <option value="activity">Mas activos</option>
              <option value="completed">Mas entrenan</option>
              <option value="created">Mas crean</option>
              <option value="name">Nombre</option>
            </select>
          </div>

          <div className="space-y-4">
            {filteredUsers.map((user) => {
              const activity = userActivityById.get(user.userId);
              const createdRoutines = (data?.routines ?? []).filter((routine) => routine.createdBy === user.userId);
              const displayName = userDisplayNameById.get(user.userId) ?? 'Usuario sin nombre';
              const subtitle = user.email && user.email !== displayName ? user.email : 'Sin email visible';

              return (
                <details key={user.userId} className="group overflow-hidden rounded-[1.5rem] border border-mist/20 bg-[linear-gradient(180deg,rgba(20,26,39,0.94),rgba(9,14,25,0.94))] shadow-soft" open={selectedUserId === user.userId}>
                  <summary className="flex cursor-pointer list-none flex-col gap-4 px-4 py-4 sm:px-5 sm:py-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="rounded-full border border-mint/20 bg-mint/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-mint/80">
                          Usuario
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-400">
                          Ultima actividad: {formatDateTime(activity?.lastCompletedAt ?? user.lastActivityAt)}
                        </div>
                      </div>

                      <div className="mt-3 text-xl font-display text-white">{displayName}</div>
                      <div className="mt-1 text-sm text-slate-400">{subtitle}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[520px]">
                      <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-center">
                        <div className="text-lg font-display text-white">{user.createdRoutines}</div>
                        <div className="text-[11px] text-slate-400">creadas</div>
                      </div>
                      <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-center">
                        <div className="text-lg font-display text-white">{activity?.totalSessions ?? user.completedSessions}</div>
                        <div className="text-[11px] text-slate-400">realizadas</div>
                      </div>
                      <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-center">
                        <div className="text-lg font-display text-white">{formatDuration(activity ? Math.round(activity.totalDuration / Math.max(activity.totalSessions, 1)) : undefined)}</div>
                        <div className="text-[11px] text-slate-400">promedio</div>
                      </div>
                      <div className="flex items-center justify-center rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-slate-300 transition group-open:rotate-180">
                        <ChevronDown size={18} />
                      </div>
                    </div>
                  </summary>

                  <div className="border-t border-mist/20 px-4 py-4 sm:px-5 sm:py-5">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
                      <div>
                        <div className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Rutinas realizadas</div>
                        {activity?.routines.length ? (
                          <div className="space-y-3">
                            {activity.routines.map((routine) => (
                              <details key={`${user.userId}-${routine.routineId ?? routine.routineName}`} className="group/routine overflow-hidden rounded-2xl border border-mist/20 bg-white/[0.03]">
                                <summary className="flex cursor-pointer list-none flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <div className="text-base font-semibold text-white">{routine.routineName}</div>
                                    <div className="mt-1 text-xs text-slate-400">Ultima vez: {formatDateTime(routine.lastCompletedAt)}</div>
                                  </div>

                                  <div className="grid grid-cols-3 gap-2 sm:min-w-[300px]">
                                    <div className="rounded-xl bg-ink/40 px-3 py-2 text-center">
                                      <div className="text-base font-display text-white">{routine.sessionCount}</div>
                                      <div className="text-[11px] text-slate-400">sesiones</div>
                                    </div>
                                    <div className="rounded-xl bg-ink/40 px-3 py-2 text-center">
                                      <div className="text-base font-display text-white">{formatDuration(Math.round(routine.totalDuration / Math.max(routine.sessionCount, 1)))}</div>
                                      <div className="text-[11px] text-slate-400">promedio</div>
                                    </div>
                                    <div className="flex items-center justify-center rounded-xl bg-ink/40 px-3 py-2 text-slate-300 transition group-open/routine:rotate-180">
                                      <ChevronDown size={16} />
                                    </div>
                                  </div>
                                </summary>

                                <div className="border-t border-mist/20 p-3">
                                  <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                                    {routine.exercises.map((exercise) => (
                                      <div key={`${user.userId}-${routine.routineName}-${exercise.exerciseId}`} className="rounded-2xl border border-white/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-4">
                                        <div className="text-sm font-semibold text-white">{exercise.exerciseName}</div>
                                        <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">Actividad agregada</div>

                                        <div className="mt-4 grid grid-cols-2 gap-2">
                                          <div className="rounded-xl bg-ink/45 px-3 py-2">
                                            <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-slate-400">
                                              <CheckCircle2 size={12} /> Series
                                            </div>
                                            <div className="mt-1 text-base font-display text-white">{exercise.completedSets}/{exercise.totalLoggedSets}</div>
                                          </div>
                                          <div className="rounded-xl bg-ink/45 px-3 py-2">
                                            <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-slate-400">
                                              <Weight size={12} /> Top
                                            </div>
                                            <div className="mt-1 text-base font-display text-white">{exercise.topWeight > 0 ? `${exercise.topWeight} kg` : '-'}</div>
                                          </div>
                                        </div>

                                        <div className="mt-3 text-xs text-slate-400">Ultima ejecucion: {formatDateTime(exercise.lastPerformedAt)}</div>
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

                      <div className="space-y-4">
                        <div className="rounded-2xl border border-mist/20 bg-white/[0.03] p-4">
                          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Resumen rapido</div>
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-xl bg-ink/40 px-3 py-3 text-center">
                              <div className="text-base font-display text-white">{activity?.routines.length ?? 0}</div>
                              <div className="text-[11px] text-slate-400">rutinas activas</div>
                            </div>
                            <div className="rounded-xl bg-ink/40 px-3 py-3 text-center">
                              <div className="text-base font-display text-white">{formatDuration(activity?.totalDuration)}</div>
                              <div className="text-[11px] text-slate-400">tiempo acumulado</div>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-mist/20 bg-white/[0.03] p-4">
                          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Rutinas creadas</div>
                          {createdRoutines.length ? (
                            <div className="space-y-2">
                              {createdRoutines.map((routine) => (
                                <div key={`${user.userId}-${routine.routineId}-created`} className="rounded-xl bg-ink/40 px-3 py-3">
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

        <SectionAccordion
          title="Rutinas"
          subtitle="Inventario general de rutinas y sus ejercicios configurados."
          badge={<div className="chip">{filteredRoutines.length}</div>}
        >
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">Seccion secundaria para revisar estructura y uso.</p>
            <select value={routineSort} onChange={(event) => setRoutineSort(event.target.value as typeof routineSort)} className="input input-sm bg-white/[0.03] text-sm sm:w-auto">
              <option value="usage">Mas usadas</option>
              <option value="lastCompleted">Mas recientes</option>
              <option value="name">Nombre</option>
            </select>
          </div>

          <div className="space-y-3">
            {filteredRoutines.map((routine) => (
              <details key={routine.routineId} className="group overflow-hidden rounded-2xl border border-mist/20 bg-white/[0.03]">
                <summary className="flex cursor-pointer list-none flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-white">{routine.name}</div>
                    <div className="mt-1 text-sm text-slate-400">Creador: {routine.createdByName || 'Usuario sin nombre'}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:min-w-[320px]">
                    <div className="rounded-xl bg-ink/40 p-3 text-center">
                      <div className="text-base font-display text-white">{routine.timesUsed}</div>
                      <div className="text-[11px] text-slate-400">usos</div>
                    </div>
                    <div className="rounded-xl bg-ink/40 p-3 text-center">
                      <div className="text-sm font-semibold text-white">{formatDateTime(routine.lastCompletedAt)}</div>
                      <div className="text-[11px] text-slate-400">ultima vez</div>
                    </div>
                    <div className="flex items-center justify-center rounded-xl bg-ink/40 p-3 text-slate-300 transition group-open:rotate-180">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </summary>

                <div className="border-t border-mist/20 p-3">
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {routine.exercises.map((exercise) => (
                      <div key={`${routine.routineId}-${exercise.exerciseId}`} className="rounded-xl border border-white/5 bg-ink/35 p-3 text-sm">
                        <div className="text-white">{exercise.name}</div>
                        <div className="mt-1 text-slate-400">{exercise.sets}x{exercise.reps}{exercise.restTime ? ` - ${exercise.restTime}s` : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </SectionAccordion>

        <SectionAccordion
          title="Bitacora de sesiones"
          subtitle="Registro detallado de sesiones individuales solo para auditoria puntual."
          badge={<div className="chip">{filteredSessions.length}</div>}
        >
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">Se mantiene como log auxiliar; la revision principal vive en la seccion de usuarios.</p>
            <select value={sessionSort} onChange={(event) => setSessionSort(event.target.value as typeof sessionSort)} className="input input-sm bg-white/[0.03] text-sm sm:w-auto">
              <option value="recent">Mas recientes</option>
              <option value="duration">Mas largas</option>
              <option value="user">Usuario</option>
            </select>
          </div>

          <div className="space-y-3">
            {visibleFilteredSessions.map((session) => (
              <details key={session.sessionId} className="group overflow-hidden rounded-2xl border border-mist/20 bg-white/[0.03]">
                <summary className="flex cursor-pointer list-none flex-col gap-2 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-base font-semibold text-white">{session.routineName}</div>
                    <div className="mt-1 text-sm text-slate-400">{session.userName && !looksLikeId(session.userName) ? session.userName : 'Usuario sin nombre'}</div>
                    <div className="mt-1 text-xs text-slate-500">{formatDateTime(session.startedAt)} - {formatDateTime(session.completedAt)}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:min-w-[220px]">
                    <div className="rounded-xl bg-ink/40 p-3 text-center">
                      <div className="text-base font-display text-white">{formatDuration(session.totalDuration)}</div>
                      <div className="text-[11px] text-slate-400">duracion</div>
                    </div>
                    <div className="flex items-center justify-center rounded-xl bg-ink/40 p-3 text-slate-300 transition group-open:rotate-180">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </summary>

                <div className="border-t border-mist/20 p-3">
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {session.exercises.filter(isExerciseLog).map((exerciseLog) => {
                      const exerciseName = getRoutineExerciseName(routinesById, session.routineId, exerciseLog.exerciseId);
                      return (
                        <div key={`${session.sessionId}-${exerciseLog.exerciseId}`} className="rounded-xl border border-white/5 bg-ink/40 p-3">
                          <div className="text-sm font-semibold text-white">{exerciseName}</div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-lg bg-white/[0.03] px-2 py-2 text-slate-300">
                              Series: {getCompletedSetsCount(exerciseLog.sets)}/{exerciseLog.sets.length}
                            </div>
                            <div className="rounded-lg bg-white/[0.03] px-2 py-2 text-slate-300">
                              Top: {getTopWeight(exerciseLog.sets) > 0 ? `${getTopWeight(exerciseLog.sets)} kg` : '-'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
        </SectionAccordion>
      </main>
    </div>
  );
};
