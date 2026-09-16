import type {
  ActivityKind,
  DashboardCompetition,
  DashboardData,
  DashboardExerciseProgressSummary,
  DashboardRecentSession,
  DashboardRoutine,
  Exercise,
  LeaderboardEntry,
  MuscleGroup,
  SportType,
  WorkoutCalendarDay
} from '../../../shared/types';
import { fetchApiJson } from '../../../shared/api/transport';
import {
  expectArray,
  expectDate,
  expectEnum,
  expectNumber,
  expectRecord,
  expectString,
  optionalEnum,
  optionalNumber,
  optionalString
} from '../../../shared/api/wire';

const ACTIVITY_KINDS = ['workout', 'sport'] as const satisfies readonly ActivityKind[];
const SPORT_TYPES = ['archery', 'hiit'] as const satisfies readonly SportType[];
const MUSCLE_GROUPS = ['pecho', 'espalda', 'piernas', 'hombros', 'brazos', 'core', 'fullbody'] as const satisfies readonly MuscleGroup[];

const decodeExercise = (value: unknown, path: string): Exercise => {
  const exercise = expectRecord(value, path);
  const repsBySet = exercise.repsBySet == null
    ? undefined
    : expectArray(exercise.repsBySet, `${path}.repsBySet`).map((reps, index) => (
        expectNumber(reps, `${path}.repsBySet[${index}]`)
      ));
  const video = exercise.video == null
    ? undefined
    : (() => {
        const videoPath = `${path}.video`;
        const rawVideo = expectRecord(exercise.video, videoPath);
        return {
          provider: expectEnum(rawVideo.provider, ['musclewiki'] as const, `${videoPath}.provider`),
          slug: expectString(rawVideo.slug, `${videoPath}.slug`),
          url: expectString(rawVideo.url, `${videoPath}.url`),
          pageUrl: expectString(rawVideo.pageUrl, `${videoPath}.pageUrl`),
          variants: rawVideo.variants == null
            ? undefined
            : expectArray(rawVideo.variants, `${videoPath}.variants`).map((variantValue, index) => {
                const variantPath = `${videoPath}.variants[${index}]`;
                const variant = expectRecord(variantValue, variantPath);
                return {
                  url: expectString(variant.url, `${variantPath}.url`),
                  kind: expectString(variant.kind, `${variantPath}.kind`)
                };
              })
        };
      })();
  return {
    id: expectString(exercise.id, `${path}.id`),
    name: expectString(exercise.name, `${path}.name`),
    sets: expectNumber(exercise.sets, `${path}.sets`),
    reps: expectNumber(exercise.reps, `${path}.reps`),
    repsBySet,
    restTime: optionalNumber(exercise.restTime, `${path}.restTime`),
    muscleGroup: optionalEnum(exercise.muscleGroup, MUSCLE_GROUPS, `${path}.muscleGroup`),
    video
  };
};

const decodeLeaderboardEntry = (
  value: unknown,
  path: string,
  currentUserId: string,
  currentUserName: string
): LeaderboardEntry | null => {
  if (value == null) return null;
  const entry = expectRecord(value, path);
  const userId = expectString(entry.userId, `${path}.userId`);
  const name = optionalString(entry.name, `${path}.name`)?.trim();
  return {
    userId,
    name: name || (userId === currentUserId ? currentUserName.trim() || 'Tu' : `Usuario ${userId.slice(0, 6)}`),
    avatarUrl: optionalString(entry.avatarUrl, `${path}.avatarUrl`),
    totalWorkouts: expectNumber(entry.totalWorkouts, `${path}.totalWorkouts`),
    position: expectNumber(entry.position, `${path}.position`)
  };
};

const decodeRecentActivity = (value: unknown, path: string): DashboardRecentSession => {
  const activity = expectRecord(value, path);
  return {
    id: expectString(activity.id, `${path}.id`),
    routineId: optionalString(activity.routineId, `${path}.routineId`),
    routineName: expectString(activity.routineName, `${path}.routineName`),
    primaryMuscleGroup: optionalEnum(activity.primaryMuscleGroup, MUSCLE_GROUPS, `${path}.primaryMuscleGroup`),
    completedAt: expectDate(activity.completedAt, `${path}.completedAt`),
    totalDuration: optionalNumber(activity.totalDuration, `${path}.totalDuration`),
    activityKind: expectEnum(activity.activityKind, ACTIVITY_KINDS, `${path}.activityKind`),
    sportType: optionalEnum(activity.sportType, SPORT_TYPES, `${path}.sportType`)
  };
};

const decodeCalendar = (value: unknown): WorkoutCalendarDay[] => {
  return expectArray(value, 'dashboard.calendar').map((dayValue, dayIndex) => {
    const path = `dashboard.calendar[${dayIndex}]`;
    const day = expectRecord(dayValue, path);
    return {
      date: expectString(day.date, `${path}.date`),
      workouts: expectArray(day.workouts, `${path}.workouts`).map((activityValue, activityIndex) => {
        const activityPath = `${path}.workouts[${activityIndex}]`;
        const activity = expectRecord(activityValue, activityPath);
        return {
          sessionId: expectString(activity.sessionId, `${activityPath}.sessionId`),
          routineName: expectString(activity.routineName, `${activityPath}.routineName`),
          muscleGroup: optionalEnum(activity.muscleGroup, MUSCLE_GROUPS, `${activityPath}.muscleGroup`),
          activityKind: expectEnum(activity.activityKind, ACTIVITY_KINDS, `${activityPath}.activityKind`),
          sportType: optionalEnum(activity.sportType, SPORT_TYPES, `${activityPath}.sportType`)
        };
      })
    };
  });
};

const decodeRoutine = (value: unknown, index: number): DashboardRoutine => {
  const path = `dashboard.dashboardRoutines[${index}]`;
  const routine = expectRecord(value, path);
  return {
    id: expectString(routine.id, `${path}.id`),
    name: expectString(routine.name, `${path}.name`),
    description: optionalString(routine.description, `${path}.description`),
    exercises: expectArray(routine.exercises, `${path}.exercises`).map((exercise, exerciseIndex) => (
      decodeExercise(exercise, `${path}.exercises[${exerciseIndex}]`)
    )),
    createdAt: expectDate(routine.createdAt, `${path}.createdAt`),
    updatedAt: expectDate(routine.updatedAt, `${path}.updatedAt`),
    createdBy: expectString(routine.createdBy, `${path}.createdBy`),
    createdByName: optionalString(routine.createdByName, `${path}.createdByName`),
    createdByAvatarUrl: optionalString(routine.createdByAvatarUrl, `${path}.createdByAvatarUrl`),
    isPublic: routine.isPublic === true,
    timesUsed: optionalNumber(routine.timesUsed, `${path}.timesUsed`),
    userId: optionalString(routine.userId, `${path}.userId`),
    primaryMuscleGroup: optionalEnum(routine.primaryMuscleGroup, MUSCLE_GROUPS, `${path}.primaryMuscleGroup`),
    secondaryMuscleGroups: routine.secondaryMuscleGroups == null
      ? undefined
      : expectArray(routine.secondaryMuscleGroups, `${path}.secondaryMuscleGroups`).map((group, groupIndex) => (
          expectEnum(group, MUSCLE_GROUPS, `${path}.secondaryMuscleGroups[${groupIndex}]`)
        )),
    exerciseCount: expectNumber(routine.exerciseCount, `${path}.exerciseCount`)
  };
};

const decodeCompetition = (
  value: unknown,
  currentUserId: string,
  currentUserName: string
): DashboardCompetition => {
  const competition = expectRecord(value, 'dashboard.competition');
  return {
    weekLeader: decodeLeaderboardEntry(competition.weekLeader, 'dashboard.competition.weekLeader', currentUserId, currentUserName),
    monthLeader: decodeLeaderboardEntry(competition.monthLeader, 'dashboard.competition.monthLeader', currentUserId, currentUserName),
    userWeekRank: decodeLeaderboardEntry(competition.userWeekRank, 'dashboard.competition.userWeekRank', currentUserId, currentUserName),
    userMonthRank: decodeLeaderboardEntry(competition.userMonthRank, 'dashboard.competition.userMonthRank', currentUserId, currentUserName)
  };
};

const decodeExerciseProgress = (value: unknown, index: number): DashboardExerciseProgressSummary => {
  const path = `dashboard.exerciseProgress[${index}]`;
  const progress = expectRecord(value, path);
  const trend = expectEnum(progress.trend, ['up', 'down', 'flat', 'neutral'] as const, `${path}.trend`);
  return {
    exerciseId: expectString(progress.exerciseId, `${path}.exerciseId`),
    exerciseName: expectString(progress.exerciseName, `${path}.exerciseName`),
    points: expectArray(progress.points, `${path}.points`).map((pointValue, pointIndex) => {
      const pointPath = `${path}.points[${pointIndex}]`;
      const point = expectRecord(pointValue, pointPath);
      return {
        timestamp: expectNumber(point.timestamp, `${pointPath}.timestamp`),
        bestWeight: expectNumber(point.bestWeight, `${pointPath}.bestWeight`),
        completedSets: expectNumber(point.completedSets, `${pointPath}.completedSets`),
        totalWeight: expectNumber(point.totalWeight, `${pointPath}.totalWeight`)
      };
    }),
    totalSessions: expectNumber(progress.totalSessions, `${path}.totalSessions`),
    personalRecord: expectNumber(progress.personalRecord, `${path}.personalRecord`),
    lastWeight: expectNumber(progress.lastWeight, `${path}.lastWeight`),
    previousWeight: progress.previousWeight == null ? null : expectNumber(progress.previousWeight, `${path}.previousWeight`),
    trend,
    lastCompletedAt: expectDate(progress.lastCompletedAt, `${path}.lastCompletedAt`),
    weeklyVolumeKg: expectNumber(progress.weeklyVolumeKg, `${path}.weeklyVolumeKg`)
  };
};

export const decodeDashboardData = (
  value: unknown,
  currentUserId: string,
  currentUserName: string
): DashboardData => {
  const dashboard = expectRecord(value, 'dashboard');
  const summary = expectRecord(dashboard.summary, 'dashboard.summary');
  const rawLastWeights = expectRecord(dashboard.lastWeightsByRoutine, 'dashboard.lastWeightsByRoutine');
  const lastWeightsByRoutine = Object.fromEntries(
    Object.entries(rawLastWeights).map(([routineId, exerciseValues]) => {
      const routinePath = `dashboard.lastWeightsByRoutine.${routineId}`;
      const rawExercises = expectRecord(exerciseValues, routinePath);
      return [routineId, Object.fromEntries(
        Object.entries(rawExercises).map(([exerciseId, weights]) => [
          exerciseId,
          expectArray(weights, `${routinePath}.${exerciseId}`).map((weight, index) => (
            expectNumber(weight, `${routinePath}.${exerciseId}[${index}]`)
          ))
        ])
      )];
    })
  );

  return {
    summary: {
      totalWorkouts: expectNumber(summary.totalWorkouts, 'dashboard.summary.totalWorkouts'),
      thisWeekWorkouts: expectNumber(summary.thisWeekWorkouts, 'dashboard.summary.thisWeekWorkouts'),
      thisMonthWorkouts: expectNumber(summary.thisMonthWorkouts, 'dashboard.summary.thisMonthWorkouts'),
      currentStreak: expectNumber(summary.currentStreak, 'dashboard.summary.currentStreak'),
      longestStreak: expectNumber(summary.longestStreak, 'dashboard.summary.longestStreak'),
      averageDurationMin: expectNumber(summary.averageDurationMin, 'dashboard.summary.averageDurationMin')
    },
    recentSessions: expectArray(dashboard.recentSessions, 'dashboard.recentSessions').map((activity, index) => (
      decodeRecentActivity(activity, `dashboard.recentSessions[${index}]`)
    )),
    calendar: decodeCalendar(dashboard.calendar),
    dashboardRoutines: expectArray(dashboard.dashboardRoutines, 'dashboard.dashboardRoutines').map(decodeRoutine),
    competition: decodeCompetition(dashboard.competition, currentUserId, currentUserName),
    lastWeightsByRoutine,
    exerciseProgress: expectArray(dashboard.exerciseProgress, 'dashboard.exerciseProgress').map(decodeExerciseProgress)
  };
};

export const fetchDashboard = async (
  currentUserId: string,
  currentUserName: string,
  signal?: AbortSignal
): Promise<DashboardData> => {
  const response = await fetchApiJson('/v1/data/dashboard', { signal });
  return decodeDashboardData(response, currentUserId, currentUserName);
};
