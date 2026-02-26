import { MuscleGroup, MuscleGroupInfo, Routine, WorkoutSession } from '../types';

// Configuración de grupos musculares
export const MUSCLE_GROUPS: Record<MuscleGroup, MuscleGroupInfo> = {
  pecho: { name: 'Pecho', color: '#ef4444' },
  espalda: { name: 'Espalda', color: '#3b82f6' },
  piernas: { name: 'Piernas', color: '#10b981' },
  hombros: { name: 'Hombros', color: '#f59e0b' },
  brazos: { name: 'Brazos', color: '#8b5cf6' },
  core: { name: 'Core', color: '#ec4899' },
  fullbody: { name: 'Full Body', color: '#6b7280' }
};

// Diccionario de ejercicios comunes y sus grupos musculares
const EXERCISE_MUSCLE_GROUPS: Record<string, MuscleGroup> = {
  // Pecho
  'press de banca': 'pecho',
  'press inclinado': 'pecho',
  'aperturas': 'pecho',
  'fondos': 'pecho',
  'press': 'pecho',

  // Espalda
  'dominadas': 'espalda',
  'pull ups': 'espalda',
  'remo': 'espalda',
  'jalones': 'espalda',
  'peso muerto': 'espalda',
  'deadlift': 'espalda',

  // Piernas
  'sentadillas': 'piernas',
  'squat': 'piernas',
  'prensa': 'piernas',
  'leg press': 'piernas',
  'curl': 'piernas',
  'extensión': 'piernas',
  'gemelos': 'piernas',
  'calf': 'piernas',

  // Hombros
  'press militar': 'hombros',
  'overhead press': 'hombros',
  'elevaciones laterales': 'hombros',
  'vuelos': 'hombros',
  'elevaciones': 'hombros',

  // Brazos
  'curl de bíceps': 'brazos',
  'curl martillo': 'brazos',
  'extensión de tríceps': 'brazos',
  'tríceps': 'brazos',
  'bíceps': 'brazos'
};

// Función para detectar el grupo muscular de un ejercicio
export const detectMuscleGroup = (exerciseName: string): MuscleGroup => {
  const name = exerciseName.toLowerCase();

  for (const [keyword, group] of Object.entries(EXERCISE_MUSCLE_GROUPS)) {
    if (name.includes(keyword)) {
      return group;
    }
  }

  return 'fullbody'; // Por defecto si no se puede determinar
};

// Función para determinar el grupo muscular principal de una rutina
export const getRoutinePrimaryMuscleGroup = (routine: Routine): MuscleGroup => {
  if (routine.primaryMuscleGroup) {
    return routine.primaryMuscleGroup;
  }

  // Si no está definido, calcularlo basado en los ejercicios
  const muscleGroupCounts: Record<MuscleGroup, number> = {
    pecho: 0,
    espalda: 0,
    piernas: 0,
    hombros: 0,
    brazos: 0,
    core: 0,
    fullbody: 0
  };

  routine.exercises.forEach(exercise => {
    const group = exercise.muscleGroup || detectMuscleGroup(exercise.name);
    muscleGroupCounts[group]++;
  });

  // Encontrar el grupo con más ejercicios
  let maxCount = 0;
  let primaryGroup: MuscleGroup = 'fullbody';

  Object.entries(muscleGroupCounts).forEach(([group, count]) => {
    if (count > maxCount) {
      maxCount = count;
      primaryGroup = group as MuscleGroup;
    }
  });

  return primaryGroup;
};

// Función para obtener rutinas por grupo muscular
export const getRoutinesByMuscleGroup = (routines: Routine[], muscleGroup: MuscleGroup): Routine[] => {
  return routines.filter(routine => getRoutinePrimaryMuscleGroup(routine) === muscleGroup);
};

// Función para recomendar rutina basada en el historial
export const getRecommendedMuscleGroup = (recentWorkouts: WorkoutSession[]): MuscleGroup | null => {
  try {
    if (!recentWorkouts || recentWorkouts.length === 0) return null;

    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);

    // Obtener entrenamientos de los últimos 3 días
    const recentMuscleGroups = recentWorkouts
      .filter(workout => workout.completedAt && workout.completedAt >= threeDaysAgo)
      .map(workout => workout.primaryMuscleGroup)
      .filter(group => group !== undefined) as MuscleGroup[];

    // Si no hay entrenamientos recientes, sugerir cualquier grupo
    if (recentMuscleGroups.length === 0) return null;

    // Encontrar grupos musculares que NO se han entrenado recientemente
    const allGroups: MuscleGroup[] = ['pecho', 'espalda', 'piernas', 'hombros', 'brazos'];
    const untrainedGroups = allGroups.filter(group => !recentMuscleGroups.includes(group));

    // Si todos los grupos se han entrenado, recomendar el menos entrenado
    if (untrainedGroups.length === 0) {
      const groupCounts: Record<string, number> = {};
      recentMuscleGroups.forEach(group => {
        groupCounts[group] = (groupCounts[group] || 0) + 1;
      });

      let minCount = Infinity;
      let recommendedGroup: MuscleGroup = 'pecho';

      allGroups.forEach(group => {
        const count = groupCounts[group] || 0;
        if (count < minCount) {
          minCount = count;
          recommendedGroup = group;
        }
      });

      return recommendedGroup;
    }

    // Retornar un grupo no entrenado de forma determinística por día
    const daySeed = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    const seedSource = `${daySeed}:${recentMuscleGroups.join('|')}`;
    let hash = 0;
    for (let index = 0; index < seedSource.length; index += 1) {
      hash = (hash * 31 + seedSource.charCodeAt(index)) >>> 0;
    }

    return untrainedGroups[hash % untrainedGroups.length];
  } catch {
    return null;
  }
};
