import React, { useMemo, useReducer } from 'react';
import { RefreshCw, Shield } from 'lucide-react';
import { useAdminOverview } from '../hooks/useAdminOverview';
import { PageSkeleton } from '../../../shared/ui/PageSkeleton';
import { AdminControlPanel } from '../components/AdminControlPanel';
import { AdminSummaryCards } from '../components/AdminSummaryCards';
import { AdminUsersSection } from '../components/AdminUsersSection';
import { AdminRoutinesSection } from '../components/AdminRoutinesSection';
import { AdminSessionsSection } from '../components/AdminSessionsSection';
import {
  buildCreatorNameByUserId,
  buildUserActivityById,
  buildUserDisplayNameById,
  compareRoutines,
  compareSessions,
  compareUsers,
  isWithinRange,
  SESSION_PAGE_SIZE,
  type AdminDateRange,
  type AdminPageProps,
  type AdminRoutineSort,
  type AdminSessionSort,
  type AdminUserSort
} from '../lib/adminPage';

interface AdminPageState {
  selectedUserId: string;
  selectedRoutineId: string;
  dateRange: AdminDateRange;
  searchQuery: string;
  userSort: AdminUserSort;
  routineSort: AdminRoutineSort;
  sessionSort: AdminSessionSort;
  visibleSessions: number;
  openUserIds: Set<string>;
}

type AdminPageAction =
  | { type: 'setSearchQuery'; value: string }
  | { type: 'setSelectedUserId'; value: string }
  | { type: 'setSelectedRoutineId'; value: string }
  | { type: 'setDateRange'; value: AdminDateRange }
  | { type: 'setUserSort'; value: AdminUserSort }
  | { type: 'setRoutineSort'; value: AdminRoutineSort }
  | { type: 'setSessionSort'; value: AdminSessionSort }
  | { type: 'resetFilters' }
  | { type: 'showMoreSessions' }
  | { type: 'toggleUser'; userId: string; open: boolean }
  | { type: 'setAllUsersOpen'; userIds: string[]; open: boolean };

const initialState: AdminPageState = {
  selectedUserId: 'all',
  selectedRoutineId: 'all',
  dateRange: '30d',
  searchQuery: '',
  userSort: 'activity',
  routineSort: 'usage',
  sessionSort: 'recent',
  visibleSessions: SESSION_PAGE_SIZE,
  openUserIds: new Set<string>()
};

const reducer = (state: AdminPageState, action: AdminPageAction): AdminPageState => {
  switch (action.type) {
    case 'setSearchQuery':
      return { ...state, searchQuery: action.value, visibleSessions: SESSION_PAGE_SIZE };
    case 'setSelectedUserId':
      return { ...state, selectedUserId: action.value, visibleSessions: SESSION_PAGE_SIZE };
    case 'setSelectedRoutineId':
      return { ...state, selectedRoutineId: action.value, visibleSessions: SESSION_PAGE_SIZE };
    case 'setDateRange':
      return { ...state, dateRange: action.value, visibleSessions: SESSION_PAGE_SIZE };
    case 'setUserSort':
      return { ...state, userSort: action.value };
    case 'setRoutineSort':
      return { ...state, routineSort: action.value };
    case 'setSessionSort':
      return { ...state, sessionSort: action.value };
    case 'resetFilters':
      return initialState;
    case 'showMoreSessions':
      return { ...state, visibleSessions: state.visibleSessions + SESSION_PAGE_SIZE };
    case 'toggleUser': {
      const next = new Set(state.openUserIds);
      if (action.open) next.add(action.userId);
      else next.delete(action.userId);
      return { ...state, openUserIds: next };
    }
    case 'setAllUsersOpen':
      return { ...state, openUserIds: action.open ? new Set(action.userIds) : new Set() };
    default:
      return state;
  }
};

export const AdminPage: React.FC<AdminPageProps> = ({ enabled }) => {
  const { data, loading, refreshing, error, refresh } = useAdminOverview(enabled);
  const [state, dispatch] = useReducer(reducer, initialState);

  const routines = useMemo(() => data?.routines ?? [], [data?.routines]);
  const users = useMemo(() => data?.users ?? [], [data?.users]);
  const sessions = useMemo(() => data?.sessions ?? [], [data?.sessions]);
  const routinesById = useMemo(() => new Map(routines.map((routine) => [routine.routineId, routine])), [routines]);
  const creatorNameByUserId = useMemo(() => buildCreatorNameByUserId(routines), [routines]);
  const normalizedQuery = state.searchQuery.trim().toLowerCase();

  const filteredSessions = useMemo(() => {
    return [...sessions]
      .filter((session) => {
        if (state.selectedUserId !== 'all' && session.userId !== state.selectedUserId) return false;
        if (state.selectedRoutineId !== 'all' && session.routineId !== state.selectedRoutineId) return false;
        if (!isWithinRange(session.completedAt ?? session.startedAt, state.dateRange)) return false;
        if (!normalizedQuery) return true;

        const routine = session.routineId ? routinesById.get(session.routineId) : undefined;
        const routineExercises = routine?.exercises.map((exercise) => exercise.name).join(' ') ?? '';
        const haystack = [session.userName, session.routineName, routineExercises].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .sort((left, right) => compareSessions(left, right, state.sessionSort));
  }, [normalizedQuery, routinesById, sessions, state.dateRange, state.selectedRoutineId, state.selectedUserId, state.sessionSort]);

  const userActivityById = useMemo(() => buildUserActivityById(filteredSessions, routinesById), [filteredSessions, routinesById]);
  const userDisplayNameById = useMemo(() => buildUserDisplayNameById(users, creatorNameByUserId, userActivityById), [creatorNameByUserId, userActivityById, users]);

  const filteredUsers = useMemo(() => {
    return [...users]
      .filter((user) => {
        if (state.selectedUserId !== 'all' && user.userId !== state.selectedUserId) return false;
        const activity = userActivityById.get(user.userId);
        if (state.selectedRoutineId !== 'all' && !activity?.routines.some((routine) => routine.routineId === state.selectedRoutineId)) {
          return false;
        }
        if (!isWithinRange(activity?.lastCompletedAt ?? user.lastActivityAt, state.dateRange)) return false;
        if (!normalizedQuery) return true;

        const activityText = activity?.routines.flatMap((routine) => [routine.routineName, ...routine.exercises.map((exercise) => exercise.exerciseName)]).join(' ') ?? '';
        const haystack = [userDisplayNameById.get(user.userId), user.email, activityText].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .sort((left, right) => compareUsers(left, right, state.userSort));
  }, [normalizedQuery, state.dateRange, state.selectedRoutineId, state.selectedUserId, state.userSort, userActivityById, userDisplayNameById, users]);

  const filteredRoutines = useMemo(() => {
    return [...routines]
      .filter((routine) => {
        if (state.selectedUserId !== 'all' && routine.createdBy !== state.selectedUserId) return false;
        if (state.selectedRoutineId !== 'all' && routine.routineId !== state.selectedRoutineId) return false;
        if (!isWithinRange(routine.lastCompletedAt, state.dateRange)) return false;
        if (!normalizedQuery) return true;

        const exerciseNames = routine.exercises.map((exercise) => exercise.name).join(' ');
        const haystack = [routine.name, routine.createdByName, exerciseNames].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .sort((left, right) => compareRoutines(left, right, state.routineSort));
  }, [normalizedQuery, routines, state.dateRange, state.routineSort, state.selectedRoutineId, state.selectedUserId]);

  const visibleFilteredSessions = useMemo(() => filteredSessions.slice(0, state.visibleSessions), [filteredSessions, state.visibleSessions]);
  const userOptions = useMemo(() => users.map((user) => ({ value: user.userId, label: userDisplayNameById.get(user.userId) ?? 'Usuario sin nombre' })), [userDisplayNameById, users]);
  const routineOptions = useMemo(() => routines.map((routine) => ({ value: routine.routineId, label: routine.name })), [routines]);
  const areAllUsersExpanded = filteredUsers.length > 0 && filteredUsers.every((user) => state.openUserIds.has(user.userId));
  const remainingSessions = Math.min(SESSION_PAGE_SIZE, filteredSessions.length - visibleFilteredSessions.length);

  if (loading) return <PageSkeleton page="dashboard" />;
  if (!enabled) return null;

  return (
    <div className="app-shell pb-28">
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:py-8">
        <section className="rounded-[1.6rem] bg-[radial-gradient(circle_at_top_right,rgba(72,229,163,0.14),transparent_24%),linear-gradient(180deg,rgba(17,24,39,0.99),rgba(11,15,20,0.99))] px-4 py-4 shadow-lift sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-mint/85">
                <Shield size={14} className="text-mint" />
                <span>Centro de control</span>
              </div>
              <h1 className="mt-2 font-display text-[2rem] leading-[0.92] text-white sm:text-[2.5rem]">
                Admin
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                Revisa usuarios, rutinas y sesiones con una lectura más directa y menos bloques gigantes.
              </p>
            </div>

            <button type="button" onClick={() => void refresh()} disabled={refreshing} className="btn-primary inline-flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap sm:w-auto disabled:opacity-60">
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Actualizando...' : 'Actualizar datos'}</span>
            </button>
          </div>

          <div className="mt-4">
            <AdminSummaryCards summary={data?.summary} />
          </div>
        </section>

        {error && <div className="rounded-[1.5rem] border border-crimson/40 bg-crimson/10 px-4 py-4 text-sm text-crimson">{error}</div>}

        <AdminControlPanel
          searchQuery={state.searchQuery}
          selectedUserId={state.selectedUserId}
          selectedRoutineId={state.selectedRoutineId}
          dateRange={state.dateRange}
          userOptions={userOptions}
          routineOptions={routineOptions}
          visibleUsers={filteredUsers.length}
          visibleRoutines={filteredRoutines.length}
          visibleSessions={filteredSessions.length}
          onSearchChange={(value) => dispatch({ type: 'setSearchQuery', value })}
          onUserChange={(value) => dispatch({ type: 'setSelectedUserId', value })}
          onRoutineChange={(value) => dispatch({ type: 'setSelectedRoutineId', value })}
          onDateRangeChange={(value) => dispatch({ type: 'setDateRange', value })}
          onReset={() => dispatch({ type: 'resetFilters' })}
        />

        <AdminUsersSection
          users={filteredUsers}
          routines={routines}
          selectedUserId={state.selectedUserId}
          userSort={state.userSort}
          areAllUsersExpanded={areAllUsersExpanded}
          userDisplayNameById={userDisplayNameById}
          userActivityById={userActivityById}
          openUserIds={state.openUserIds}
          onUserSortChange={(value) => dispatch({ type: 'setUserSort', value })}
          onToggleAllUsers={() => dispatch({ type: 'setAllUsersOpen', userIds: filteredUsers.map((user) => user.userId), open: !areAllUsersExpanded })}
          onToggleUser={(userId, open) => dispatch({ type: 'toggleUser', userId, open })}
          onResetFilters={() => dispatch({ type: 'resetFilters' })}
        />

        <AdminRoutinesSection
          routines={filteredRoutines}
          routineSort={state.routineSort}
          onRoutineSortChange={(value) => dispatch({ type: 'setRoutineSort', value })}
          onResetFilters={() => dispatch({ type: 'resetFilters' })}
        />

        <AdminSessionsSection
          sessions={visibleFilteredSessions}
          totalSessions={filteredSessions.length}
          routinesById={routinesById}
          sessionSort={state.sessionSort}
          remainingSessions={remainingSessions}
          onSessionSortChange={(value) => dispatch({ type: 'setSessionSort', value })}
          onShowMore={() => dispatch({ type: 'showMoreSessions' })}
          onResetFilters={() => dispatch({ type: 'resetFilters' })}
        />
      </main>
    </div>
  );
};
