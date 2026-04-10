export interface User {
  id: string;
  clerkUserId?: string;
  email: string;
  name: string;
  photoURL?: string;
}

export interface AdminSummary {
  totalUsers: number;
  totalRoutines: number;
  totalCompletedSessions: number;
  averageDurationMin: number;
}

export interface AdminUserOverview {
  userId: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  createdRoutines: number;
  completedSessions: number;
  lastActivityAt?: number;
}

export interface AdminRoutineExerciseOverview {
  exerciseId: string;
  name: string;
  sets: number;
  reps: number;
  restTime?: number;
}

export interface AdminRoutineOverview {
  routineId: string;
  name: string;
  createdBy: string;
  createdByName?: string;
  timesUsed: number;
  lastCompletedAt?: number;
  exercises: AdminRoutineExerciseOverview[];
}

export interface AdminSessionOverview {
  sessionId: string;
  userId: string;
  userName?: string;
  routineId?: string;
  routineName: string;
  startedAt: number;
  completedAt?: number;
  totalDuration?: number;
  exercises: unknown[];
}

export interface AdminOverview {
  summary: AdminSummary;
  users: AdminUserOverview[];
  routines: AdminRoutineOverview[];
  sessions: AdminSessionOverview[];
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl?: string;
  totalWorkouts: number;
  position: number;
}

export interface DashboardSummary {
  totalWorkouts: number;
  thisWeekWorkouts: number;
  thisMonthWorkouts: number;
  currentStreak: number;
  longestStreak: number;
  averageDurationMin: number;
}

export interface DashboardRecentSession {
  id: string;
  routineId?: string;
  routineName: string;
  primaryMuscleGroup?: MuscleGroup;
  completedAt: Date;
  totalDuration?: number;
}

// Nuevos tipos para categorización muscular
export type MuscleGroup = 'pecho' | 'espalda' | 'piernas' | 'hombros' | 'brazos' | 'core' | 'fullbody';

export interface MuscleGroupInfo {
  name: string;
  color: string; // color hex para el calendario
}

export interface ExerciseVideoVariant {
  url: string;
  kind: string;
}

export interface ExerciseVideo {
  provider: 'musclewiki';
  slug: string;
  url: string;
  pageUrl: string;
  variants?: ExerciseVideoVariant[];
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  repsBySet?: number[]; // modo opcional: reps por serie (e.g., [12, 10, 8, 6])
  restTime?: number; // en segundos
  muscleGroup?: MuscleGroup; // nuevo campo opcional
  video?: ExerciseVideo;
}

export interface ExerciseTemplate {
  id: string;
  name: string;
  category: string;
  sets: number;
  reps: number;
  restTime: number;
  description?: string;
  video?: ExerciseVideo;
  createdBy: string;
  createdByName?: string;
  isPublic: boolean;
  createdAt: Date;
  timesUsed: number;
}

export interface WorkoutSet {
  setNumber: number;
  weight: number;
  reps?: number; // reps realizadas en esta serie (para modo reps por serie)
  completed: boolean;
  completedAt?: Date;
}

export interface ExerciseLog {
  exerciseId: string;
  userId: string;
  sets: WorkoutSet[];
  date: string; // YYYY-MM-DD format
}

// Nuevos tipos para el sistema mejorado
export interface Routine {
  id: string;
  name: string;
  description?: string;
  exercises: Exercise[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // userId del creador
  createdByName?: string; // nombre del creador (para mostrar)
  createdByAvatarUrl?: string;
  isPublic: boolean; // si otros usuarios pueden ver y usar esta rutina
  timesUsed?: number; // contador de cuántas veces se ha usado
  userId?: string; // compatibilidad con rutinas antiguas
  primaryMuscleGroup?: MuscleGroup; // grupo muscular principal de la rutina
  secondaryMuscleGroups?: MuscleGroup[]; // grupos musculares secundarios
}

export interface WorkoutSession {
  id: string;
  routineId: string;
  routineName: string;
  userId: string;
  startedAt: Date;
  completedAt?: Date;
  exercises: ExerciseLog[];
  totalDuration?: number; // en minutos
  notes?: string;
  primaryMuscleGroup?: MuscleGroup; // para el calendario
}

// Nuevo tipo para el calendario de entrenamiento
export interface WorkoutCalendarDay {
  date: string; // YYYY-MM-DD
  workouts: {
    muscleGroup: MuscleGroup;
    routineName: string;
    sessionId: string;
  }[];
}

export interface DashboardExerciseProgressPoint {
  timestamp: number;
  bestWeight: number;
  completedSets: number;
  totalWeight: number;
}

export interface DashboardExerciseProgressSummary {
  exerciseId: string;
  exerciseName: string;
  points: DashboardExerciseProgressPoint[];
  totalSessions: number;
  personalRecord: number;
  lastWeight: number;
  previousWeight: number | null;
  trend: 'up' | 'down' | 'flat' | 'neutral';
  lastCompletedAt: Date;
  weeklyVolumeKg: number;
}

export interface DashboardCompetition {
  weekLeader: LeaderboardEntry | null;
  monthLeader: LeaderboardEntry | null;
  userWeekRank: LeaderboardEntry | null;
  userMonthRank: LeaderboardEntry | null;
}

export interface DashboardRoutine extends Routine {
  exerciseCount: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  recentSessions: DashboardRecentSession[];
  calendar: WorkoutCalendarDay[];
  dashboardRoutines: DashboardRoutine[];
  competition: DashboardCompetition;
  lastWeightsByRoutine: Record<string, Record<string, number[]>>;
  exerciseProgress: DashboardExerciseProgressSummary[];
}

export interface Workout {
  id: string;
  day: string;
  exercises: Exercise[];
  name: string;
}

// ===== SPORTS TYPES =====

export type SportType = 'archery';

export type ArcheryBowType = 'recurve' | 'compound' | 'barebow' | 'longbow';

export interface ArcheryArrow {
  id: string;
  score: number;
  isGold: boolean;
  timestamp: Date;
}

export interface ArcheryEnd {
  id: string;
  roundId: string;
  endNumber: number;
  arrows: ArcheryArrow[];
  subtotal: number;
  goldCount: number;
  createdAt: Date;
}

export interface ArcheryRound {
  id: string;
  sessionId: string;
  distance: number;
  targetSize: number;
  arrowsPerEnd: number;
  order: number;
  ends: ArcheryEnd[];
  totalScore: number;
  createdAt: Date;
}

export interface SportSession {
  id: string;
  userId: string;
  sportType: SportType;
  sportName: string;
  startedAt: Date;
  completedAt?: Date;
  location?: string;
  notes?: string;
  status: 'active' | 'completed' | 'abandoned';
  archeryData?: {
    bowType: ArcheryBowType;
    arrowsUsed: number;
    rounds: ArcheryRound[];
    totalScore: number;
    maxPossibleScore: number;
    averageArrow: number;
    goldCount?: number;
  };
}

export interface SportSessionSummary {
  id: string;
  sportType: SportType;
  sportName: string;
  startedAt: Date;
  completedAt?: Date;
  location?: string;
  totalScore?: number;
  maxPossibleScore?: number;
  roundsCompleted: number;
  duration?: number;
}

export interface SportStats {
  totalSessions: number;
  thisWeekSessions: number;
  thisMonthSessions: number;
  currentStreak: number;
  longestStreak: number;
  totalArrowsShot: number;
  averageScore: number;
  personalBest: number;
}

// ===== PROFILE TYPES =====

export interface UserBodyMeasurement {
  id: string;
  uid: string;
  measuredAt: Date;
  weightKg?: number | null;
  heightCm?: number | null;
  bodyFatPercentage?: number | null;
  waistCm?: number | null;
  hipsCm?: number | null;
  chestCm?: number | null;
  armsCm?: number | null;
  thighsCm?: number | null;
  calvesCm?: number | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type BodyMeasurementInput = Omit<UserBodyMeasurement, 'id' | 'uid' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};
