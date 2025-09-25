export interface User {
  id: string;
  email: string;
  name: string;
  photoURL?: string;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  restTime?: number; // en segundos
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
  userId: string;
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