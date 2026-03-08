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
      <header className="app-header px-4 pb-5 pt-[calc(0.25rem+env(safe-area-inset-top))] sm:pb-6 sm:pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="chip mb-3 inline-flex items-center gap-2">
              <Shield size={14} /> ADMIN
            </div>
            <h1 className="text-2xl font-display text-white sm:text-3xl">Panel de administracion</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Revision operativa de usuarios, rutinas y actividad real de entrenamiento.</p>
          </div>

          <button type="button" onClick={() => void refresh()} disabled={refreshing} className="btn-secondary inline-flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap sm:w-auto disabled:opacity-60">
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Actualizando' : 'Actualizar datos'}</span>
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:py-8">
        {error && <div className="rounded-2xl border border-crimson/40 bg-crimson/10 px-4 py-3 text-sm text-crimson">{error}</div>}

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

        <AdminSummaryCards summary={data?.summary} />

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
        />

        <AdminRoutinesSection
          routines={filteredRoutines}
          routineSort={state.routineSort}
          onRoutineSortChange={(value) => dispatch({ type: 'setRoutineSort', value })}
        />

        <AdminSessionsSection
          sessions={visibleFilteredSessions}
          totalSessions={filteredSessions.length}
          routinesById={routinesById}
          sessionSort={state.sessionSort}
          remainingSessions={remainingSessions}
          onSessionSortChange={(value) => dispatch({ type: 'setSessionSort', value })}
          onShowMore={() => dispatch({ type: 'showMoreSessions' })}
        />
      </main>
    </div>
  );
};
