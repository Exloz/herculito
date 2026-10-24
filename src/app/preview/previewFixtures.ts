import type { Exercise, MuscleGroup, Routine, User, UserBodyMeasurement, WorkoutSession } from '../../shared/types';
import { getDateStringInAppTimeZone } from '../../shared/lib/dateUtils';

export const PREVIEW_USER: User = {
  id: 'preview-user', name: 'Alex López', email: 'alex@example.test'
};

export const createPreviewFixtures = (empty = false, now = new Date(), expandedRoutines = false) => {
  const daysAgo = (days: number) => new Date(now.getTime() - days * 86400000);
  const exercises: Exercise[] = [
    { id: 'press-banca', name: 'Press de banca', sets: 3, reps: 10, restTime: 90, muscleGroup: 'pecho' },
    { id: 'press-inclinado', name: 'Press inclinado con mancuernas', sets: 3, reps: 12, restTime: 75, muscleGroup: 'pecho' },
    { id: 'extension-triceps', name: 'Extensión de tríceps en polea', sets: 3, reps: 12, restTime: 60, muscleGroup: 'brazos' },
    { id: 'sentadilla', name: 'Sentadilla con barra', sets: 3, reps: 8, restTime: 120, muscleGroup: 'piernas' },
    { id: 'peso-muerto', name: 'Peso muerto rumano', sets: 3, reps: 10, restTime: 90, muscleGroup: 'piernas' },
    { id: 'remo', name: 'Remo con mancuerna', sets: 3, reps: 12, restTime: 75, muscleGroup: 'espalda' }
  ];
  const routines: Routine[] = empty ? [] : [
    { id: 'preview-push', name: 'Pecho y tríceps', description: 'Fuerza y técnica, una serie a la vez.',
      exercises: exercises.slice(0, 3), primaryMuscleGroup: 'pecho', createdBy: PREVIEW_USER.id,
      createdByName: PREVIEW_USER.name, isPublic: false, createdAt: daysAgo(30), updatedAt: daysAgo(2) },
    { id: 'preview-legs', name: 'Día de piernas', description: 'Una base fuerte para seguir avanzando.',
      exercises: exercises.slice(3, 5), primaryMuscleGroup: 'piernas', createdBy: PREVIEW_USER.id,
      createdByName: PREVIEW_USER.name, isPublic: false, createdAt: daysAgo(28), updatedAt: daysAgo(3) },
    { id: 'preview-fullbody', name: 'Full body esencial', description: 'Una rutina compartida para todo el cuerpo.',
      exercises: [exercises[0], exercises[3], exercises[5]], primaryMuscleGroup: 'fullbody',
      createdBy: 'preview-coach', createdByName: 'Equipo Herculito', isPublic: true,
      createdAt: daysAgo(20), updatedAt: daysAgo(1) }
  ];
  if (!empty && expandedRoutines) {
    const extraGroups: MuscleGroup[] = ['espalda', 'hombros', 'brazos', 'core'];
    routines.push(...extraGroups.map((group) => ({
      ...routines[0], id: `preview-${group}`, name: `Sesión de ${group}`,
      primaryMuscleGroup: group, exercises: [{ ...exercises[0], muscleGroup: group }]
    })));
    routines.push(...['Fuerza de piernas', 'Piernas y estabilidad'].map((name, index) => ({
      ...routines[1], id: `preview-shared-legs-${index}`, name,
      createdBy: 'preview-coach', createdByName: 'Equipo Herculito', isPublic: true
    })));
  }
  const sessions: WorkoutSession[] = empty ? [] : [1, 3, 5, 8, 10, 13, 16, 20].map((days, index) => {
    const routine = routines[index % 2];
    const completedAt = daysAgo(days);
    return {
      id: `preview-session-${index}`, routineId: routine.id, routineName: routine.name,
      userId: PREVIEW_USER.id, startedAt: new Date(completedAt.getTime() - 42 * 60000),
      completedAt, totalDuration: 42, primaryMuscleGroup: routine.primaryMuscleGroup,
      exercises: routine.exercises.map((exercise, exerciseIndex) => ({
        exerciseId: exercise.id, userId: PREVIEW_USER.id, date: getDateStringInAppTimeZone(completedAt),
        sets: Array.from({ length: exercise.sets }, (_, setIndex) => ({
          setNumber: setIndex + 1, weight: 50 - index * 2.5 - exerciseIndex * 10,
          reps: exercise.reps, completed: true, completedAt
        }))
      }))
    };
  });
  const measurements: UserBodyMeasurement[] = empty ? [] : [0, 14, 28].map((days, index) => ({
    id: `preview-measurement-${index}`, uid: PREVIEW_USER.id, measuredAt: daysAgo(days),
    weightKg: 74.5 + index * 0.5, heightCm: 175, waistCm: 80 + index,
    createdAt: daysAgo(days), updatedAt: daysAgo(days)
  }));
  return { routines, sessions, measurements, exercises };
};
