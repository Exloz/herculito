export interface User {
  id: string;
  email: string;
  name: string;
  photoURL?: string;
}

// Nuevos tipos para categorización muscular
export type MuscleGroup = 'pecho' | 'espalda' | 'piernas' | 'hombros' | 'brazos' | 'core' | 'fullbody';

export interface MuscleGroupInfo {
  name: string;
  icon: string; // emoji o icono
  color: string; // color hex para el calendario
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  restTime?: number; // en segundos
  muscleGroup?: MuscleGroup; // nuevo campo opcional
}

export interface WorkoutSet {
  setNumber: number;
  weight: number;
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
  isPublic: boolean; // si otros usuarios pueden ver y usar esta rutina
  timesUsed?: number; // contador de cuántas veces se ha usado
  userId?: string; // compatibilidad con rutinas antiguas
  primaryMuscleGroup?: MuscleGroup; // grupo muscular principal de la rutina
  secondaryMuscleGroups?: MuscleGroup[]; // grupos musculares secundarios
}

// Nueva interface para rutinas que un usuario ha adoptado/guardado
export interface UserRoutine {
  id: string;
  userId: string;
  routineId: string;
  addedAt: Date;
  customName?: string; // nombre personalizado por el usuario
  isFavorite?: boolean;
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

export interface ExerciseHistory {
  exerciseId: string;
  exerciseName: string;
  userId: string;
  lastWeight: number[];
  lastDate: string;
  personalRecord: number;
}

// Tipos legacy (mantener por compatibilidad)
export interface Workout {
  id: string;
  day: string; // 'monday', 'tuesday', etc.
  exercises: Exercise[];
  name: string;
}

export interface WorkoutRoutine {
  id: string;
  name: string;
  workouts: { [key: string]: Workout }; // key is day of week
}