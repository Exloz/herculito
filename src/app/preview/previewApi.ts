import type { ArcheryEnd, ArcheryRound, ExerciseLog, ExerciseTemplate, Routine, SportSession } from '../../shared/types';
import { ApiError } from '../../shared/api/apiClient';
import { expectArray, expectBoolean, expectEnum, expectNumber, expectRecord, expectString } from '../../shared/api/wire';
import { getDateStringInAppTimeZone } from '../../shared/lib/dateUtils';
import { buildExerciseProgress } from '../../features/dashboard/lib/workoutProgress';
import { decodeWorkoutSession } from '../../features/workouts/api/workoutSessionsRemote';
import { createPreviewFixtures, PREVIEW_USER } from './previewFixtures';

export const createPreviewApi = (empty = false) => {
  const state = createPreviewFixtures(empty);
  let sportSessions: SportSession[] = [];
  let hiddenRoutineIds: string[] = [];
  const exerciseLogs: ExerciseLog[] = [];
  const templates: ExerciseTemplate[] = state.exercises.map((exercise) => ({
    ...exercise, category: exercise.muscleGroup ?? 'fullbody', createdBy: PREVIEW_USER.id,
    restTime: exercise.restTime ?? 60,
    createdByName: PREVIEW_USER.name, isPublic: true, createdAt: new Date(), timesUsed: 3
  }));
  const id = () => crypto.randomUUID();
  const missing = () => { throw new ApiError('Este recurso de ejemplo ya no existe.', { status: 404 }); };

  const dashboard = () => {
    const completed = state.sessions.filter((session) => session.completedAt);
    const now = new Date();
    const recentSessions = [
      ...completed.map((session) => ({ ...session, activityKind: 'workout' as const })),
      ...sportSessions.filter((session) => session.status === 'completed').map((session) => ({
        id: session.id, routineName: session.sportName, completedAt: session.completedAt!,
        activityKind: 'sport' as const, sportType: session.sportType,
        totalDuration: Math.round((session.completedAt!.getTime() - session.startedAt.getTime()) / 60000)
      }))
    ].sort((left, right) => right.completedAt!.getTime() - left.completedAt!.getTime());
    const lastWeightsByRoutine: Record<string, Record<string, number[]>> = {};
    completed.slice().sort((left, right) => left.completedAt!.getTime() - right.completedAt!.getTime()).forEach((session) => {
      lastWeightsByRoutine[session.routineId] = Object.fromEntries(
        session.exercises.map((log) => [log.exerciseId, log.sets.map((set) => set.weight)])
      );
    });
    const calendar = new Map<string, { date: string; workouts: unknown[] }>();
    recentSessions.forEach((session) => {
      const date = getDateStringInAppTimeZone(session.completedAt!);
      const day = calendar.get(date) ?? { date, workouts: [] };
      day.workouts.push({
        sessionId: session.id, routineName: session.routineName, activityKind: session.activityKind,
        muscleGroup: 'primaryMuscleGroup' in session ? session.primaryMuscleGroup : undefined,
        sportType: 'sportType' in session ? session.sportType : undefined
      });
      calendar.set(date, day);
    });
    return {
      summary: {
        totalWorkouts: completed.length,
        thisWeekWorkouts: completed.filter((session) => now.getTime() - session.completedAt!.getTime() < 7 * 86400000).length,
        thisMonthWorkouts: completed.filter((session) => session.completedAt!.getMonth() === now.getMonth()
          && session.completedAt!.getFullYear() === now.getFullYear()).length,
        currentStreak: 0, longestStreak: completed.length ? 1 : 0,
        averageDurationMin: completed.length
          ? Math.round(completed.reduce((sum, session) => sum + (session.totalDuration ?? 0), 0) / completed.length) : 0
      },
      recentSessions: recentSessions.slice(0, 12), calendar: [...calendar.values()],
      dashboardRoutines: state.routines.filter((routine) => !hiddenRoutineIds.includes(routine.id))
        .map((routine) => ({ ...routine, exerciseCount: routine.exercises.length })),
      competition: { weekLeader: null, monthLeader: null, userWeekRank: null, userMonthRank: null },
      lastWeightsByRoutine, exerciseProgress: buildExerciseProgress(completed, state.routines)
    };
  };

  const request = (path: string, init?: RequestInit): unknown => {
    if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const url = new URL(path, 'http://preview.invalid');
    const route = url.pathname;
    const method = init?.method ?? 'GET';
    const payload = init?.body ? expectRecord(JSON.parse(String(init.body)), 'preview request') : {};
    const resourceId = typeof payload.id === 'string' ? payload.id : id();

    if (route === '/v1/data/dashboard' && method === 'GET') return dashboard();
    if (route === '/v1/data/routines/visibility') {
      if (method === 'POST') {
        const routineId = expectString(payload.routineId, 'routineId');
        hiddenRoutineIds = hiddenRoutineIds.filter((value) => value !== routineId);
        if (!expectBoolean(payload.visible, 'visible')) hiddenRoutineIds.push(routineId);
      }
      return { ok: true, hiddenRoutineIds };
    }
    if (route === '/v1/data/routines' && method === 'GET') return { routines: state.routines };
    if (route === '/v1/data/routines' && method === 'POST') {
      const routine: Routine = {
        id: resourceId, name: expectString(payload.name, 'name'),
        description: typeof payload.description === 'string' ? payload.description : undefined,
        exercises: expectArray(payload.exercises, 'exercises') as Routine['exercises'],
        isPublic: payload.isPublic === true, createdBy: PREVIEW_USER.id, createdByName: PREVIEW_USER.name,
        primaryMuscleGroup: payload.primaryMuscleGroup as Routine['primaryMuscleGroup'],
        createdAt: new Date(), updatedAt: new Date()
      };
      state.routines.push(routine);
      return { routine };
    }
    if (route === '/v1/data/routines/update' && method === 'POST') {
      const routine = state.routines.find((item) => item.id === payload.id) ?? missing();
      Object.assign(routine, expectRecord(payload.updates, 'updates'), { updatedAt: new Date() });
      return { ok: true };
    }
    if (route === '/v1/data/routines/delete' && method === 'POST') {
      state.routines = state.routines.filter((routine) => routine.id !== payload.id);
      return { ok: true };
    }
    if (route === '/v1/data/exercises' && method === 'GET') return { exercises: templates };
    if (route === '/v1/data/exercises' && method === 'POST') {
      const exercise = {
        id: resourceId, name: expectString(payload.name, 'name'), category: expectString(payload.category, 'category'),
        sets: expectNumber(payload.sets, 'sets'), reps: expectNumber(payload.reps, 'reps'),
        restTime: expectNumber(payload.restTime, 'restTime'), createdAt: new Date(),
        createdBy: PREVIEW_USER.id, createdByName: PREVIEW_USER.name, isPublic: payload.isPublic === true, timesUsed: 0
      };
      templates.push(exercise);
      return { exercise };
    }
    if (route === '/v1/data/exercises/update' && method === 'POST') {
      Object.assign(templates.find((item) => item.id === payload.id) ?? missing(), expectRecord(payload.updates, 'updates'));
      return { ok: true };
    }
    if (route === '/v1/data/exercises/use' && method === 'POST') return { ok: true };
    if (route === '/v1/data/exercise-logs') {
      if (method === 'POST') {
        const log = {
          exerciseId: expectString(payload.exerciseId, 'exerciseId'), userId: PREVIEW_USER.id,
          date: expectString(payload.date, 'date'), sets: expectArray(payload.sets, 'sets') as ExerciseLog['sets']
        };
        const previous = exerciseLogs.findIndex((item) => item.exerciseId === log.exerciseId && item.date === log.date);
        if (previous >= 0) exerciseLogs[previous] = log;
        else exerciseLogs.push(log);
        return { ok: true };
      }
      return { logs: exerciseLogs.filter((log) => log.date === url.searchParams.get('date')) };
    }
    if (route === '/v1/data/sessions' && method === 'GET') {
      return { sessions: state.sessions.filter((session) => !url.searchParams.has('completedOnly') || session.completedAt) };
    }
    if (route === '/v1/data/sessions/start' && method === 'POST') {
      const existing = state.sessions.find((session) => session.id === resourceId);
      const session = existing ?? decodeWorkoutSession({
        ...payload, id: resourceId, userId: PREVIEW_USER.id, startedAt: payload.startedAt ?? Date.now(), exercises: []
      }, 'preview session');
      if (!existing) state.sessions.push(session);
      return { session };
    }
    if (['/v1/data/sessions/progress', '/v1/data/sessions/complete'].includes(route) && method === 'POST') {
      const session = state.sessions.find((item) => item.id === payload.sessionId) ?? missing();
      const completing = route.endsWith('/complete');
      if (session.completedAt) return { ok: true, result: completing ? 'already_completed' : 'already_applied_or_current' };
      session.exercises = decodeWorkoutSession({ ...session, exercises: payload.exercises }, 'preview session').exercises;
      if (completing) {
        session.completedAt = new Date(expectNumber(payload.completedAt ?? Date.now(), 'completedAt'));
        session.totalDuration = typeof payload.totalDuration === 'number' ? payload.totalDuration : 0;
        const routine = state.routines.find((item) => item.id === session.routineId);
        const updates = payload.repsBySetUpdates ? expectRecord(payload.repsBySetUpdates, 'repsBySetUpdates') : {};
        routine?.exercises.forEach((exercise) => {
          if (Array.isArray(updates[exercise.id])) exercise.repsBySet = updates[exercise.id] as number[];
        });
      }
      return { ok: true, result: completing ? 'completed' : 'applied' };
    }
    if (/^\/v1\/data\/sessions\/[^/]+\/abandon$/.test(route) && method === 'POST') {
      const sessionId = decodeURIComponent(route.split('/')[4]);
      state.sessions = state.sessions.filter((session) => session.id !== sessionId);
      return { ok: true, result: 'abandoned' };
    }
    if (route === '/v1/data/profile/measurements' && method === 'GET') return { measurements: state.measurements };
    if (route === '/v1/data/profile/measurements' && method === 'POST') {
      const existing = state.measurements.find((item) => item.id === resourceId);
      const measurement = {
        ...payload, id: resourceId, uid: PREVIEW_USER.id, measuredAt: new Date(expectNumber(payload.measuredAt, 'measuredAt')),
        createdAt: existing?.createdAt ?? new Date(), updatedAt: new Date()
      };
      if (existing) Object.assign(existing, measurement);
      else state.measurements.push(measurement);
      return { ok: true, id: resourceId, updated: Boolean(existing) };
    }
    if (route.startsWith('/v1/data/profile/measurements/') && method === 'DELETE') {
      state.measurements = state.measurements.filter((item) => item.id !== route.split('/').pop());
      return { ok: true };
    }
    if (route === '/v1/data/sports/stats' && method === 'GET') {
      const completed = sportSessions.filter((session) => session.status === 'completed');
      return { stats: { totalSessions: completed.length, thisWeekSessions: completed.length,
        thisMonthSessions: completed.length, currentStreak: 0, longestStreak: 0 } };
    }
    if (route === '/v1/data/sports/sessions' && method === 'GET') return { sessions: sportSessions };
    if (route === '/v1/data/sports/sessions/start' && method === 'POST') {
      const existing = sportSessions.find((session) => session.id === resourceId);
      if (existing) return { session: existing };
      const sportType = expectEnum(payload.sportType, ['archery', 'hiit'] as const, 'sportType');
      const session: SportSession = {
        id: resourceId, userId: PREVIEW_USER.id, sportType,
        sportName: sportType === 'hiit' ? 'HIIT' : 'Tiro con arco', status: 'active',
        startedAt: new Date(expectNumber(payload.startedAt ?? Date.now(), 'startedAt'))
      };
      if (sportType === 'archery') {
        const config = expectRecord(payload.archeryConfig, 'archeryConfig');
        session.archeryData = { bowType: expectEnum(config.bowType, ['recurve', 'compound', 'barebow', 'longbow'] as const, 'bowType'),
          arrowsUsed: expectNumber(config.arrowsUsed, 'arrowsUsed'), rounds: [], totalScore: 0,
          maxPossibleScore: 0, averageArrow: 0, goldCount: 0 };
      } else {
        const config = expectRecord(payload.hiitConfig, 'hiitConfig');
        const intervals = expectNumber(config.intervals, 'intervals');
        const workDuration = expectNumber(config.workDuration, 'workDuration');
        const restDuration = expectNumber(config.restDuration, 'restDuration');
        const restEnabled = expectBoolean(config.restEnabled, 'restEnabled');
        session.hiitData = { intervals, workDuration, restEnabled, restDuration,
          totalWorkTime: intervals * workDuration, totalRestTime: restEnabled ? Math.max(0, intervals - 1) * restDuration : 0 };
      }
      sportSessions.push(session);
      return { session };
    }
    if (route.startsWith('/v1/data/sports/sessions/')) {
      const parts = route.split('/');
      const session = sportSessions.find((item) => item.id === parts[5]) ?? missing();
      if (method === 'GET' && parts.length === 6) return { session };
      if (method === 'DELETE' && parts.length === 6) {
        sportSessions = sportSessions.filter((item) => item.id !== session.id);
        return { ok: true };
      }
      if (method === 'POST' && ['complete', 'abandon'].includes(parts[6])) {
        const completing = parts[6] === 'complete';
        const result = completing ? (session.status === 'completed' ? 'already_completed' : 'completed')
          : (session.status === 'abandoned' ? 'already_abandoned' : 'abandoned');
        session.status = completing ? 'completed' : 'abandoned';
        if (completing) session.completedAt = new Date(expectNumber(payload.completedAt ?? Date.now(), 'completedAt'));
        if (typeof payload.notes === 'string') session.notes = payload.notes;
        return { ok: true, result, session };
      }
      const archery = session.archeryData;
      if (archery && method === 'POST' && parts[6] === 'archery' && parts[7] === 'rounds') {
        if (parts.length === 8) {
          const existing = archery.rounds.find((round) => round.id === resourceId);
          const round: ArcheryRound = existing ?? { id: resourceId, sessionId: session.id,
            distance: expectNumber(payload.distance, 'distance'), targetSize: expectNumber(payload.targetSize, 'targetSize'),
            arrowsPerEnd: expectNumber(payload.arrowsPerEnd ?? 3, 'arrowsPerEnd'), order: archery.rounds.length + 1,
            ends: [], totalScore: 0, createdAt: new Date() };
          if (!existing) archery.rounds.push(round);
          return { round };
        }
        if (parts[9] === 'ends') {
          const round = archery.rounds.find((item) => item.id === parts[8]) ?? missing();
          const existing = round.ends.find((end) => end.id === resourceId);
          if (existing) return { end: existing };
          const arrows = expectArray(payload.arrows, 'arrows').map((value) => {
            const arrow = expectRecord(value, 'arrow');
            return { id: id(), score: expectNumber(arrow.score, 'score'), isGold: expectBoolean(arrow.isGold, 'isGold'), timestamp: new Date() };
          });
          const end: ArcheryEnd = { id: resourceId, roundId: round.id, endNumber: round.ends.length + 1,
            arrows, subtotal: arrows.reduce((sum, arrow) => sum + arrow.score, 0),
            goldCount: arrows.filter((arrow) => arrow.isGold).length, createdAt: new Date() };
          round.ends.push(end);
          round.totalScore += end.subtotal;
          const allArrows = archery.rounds.flatMap((item) => item.ends.flatMap((itemEnd) => itemEnd.arrows));
          archery.totalScore = allArrows.reduce((sum, arrow) => sum + arrow.score, 0);
          archery.maxPossibleScore = allArrows.length * 10;
          archery.averageArrow = archery.totalScore / allArrows.length;
          archery.goldCount = allArrows.filter((arrow) => arrow.isGold).length;
          return { end };
        }
      }
    }
    if (route === '/v1/musclewiki/suggest' && method === 'POST') return { suggestions: [] };
    if (route === '/v1/rest/schedule' && method === 'POST') return {
      accepted: true, jobId: 'preview-timer', executeAtMs: payload.executeAtMs, requestedAtMs: payload.commandAtMs
    };
    if (route === '/v1/rest/cancel' && method === 'POST') return {
      accepted: true, canceled: true, jobId: 'preview-timer', requestedAtMs: payload.commandAtMs
    };
    throw new ApiError(`La preview no simula ${method} ${route}. No se realizó ninguna petición externa.`, { status: 501 });
  };
  return async <T = unknown>(path: string, init?: RequestInit): Promise<T> => (
    JSON.parse(JSON.stringify(request(path, init))) as T
  );
};

export const fetchPreviewJson = createPreviewApi(
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('scenario') === 'empty'
);
