export interface User {
  id: 'A' | 'B';
  name: string;
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
  userId: 'A' | 'B';
  sets: WorkoutSet[];
  date: string; // YYYY-MM-DD format
}

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