import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { detectMuscleGroup } from './muscleGroups';
import { Exercise } from '../types';

// Script para actualizar rutinas existentes con grupos musculares
export const updateExistingRoutinesWithMuscleGroups = async () => {
  try {
    console.log('🔄 Actualizando rutinas existentes con grupos musculares...');

    const routinesRef = collection(db, 'routines');
    const snapshot = await getDocs(routinesRef);

    const updatePromises = snapshot.docs.map(async (routineDoc) => {
      const routineData = routineDoc.data();

      // Si ya tiene grupo muscular, no hacer nada
      if (routineData.primaryMuscleGroup) {
        return;
      }

      // Detectar grupo muscular basado en ejercicios
      if (routineData.exercises && routineData.exercises.length > 0) {
        const muscleGroupCounts: Record<string, number> = {};

        // Contar grupos musculares en los ejercicios
        routineData.exercises.forEach((exercise: Exercise) => {
          const group = exercise.muscleGroup || detectMuscleGroup(exercise.name || '');
          muscleGroupCounts[group] = (muscleGroupCounts[group] || 0) + 1;
        });

        // Encontrar el grupo principal
        let primaryMuscleGroup = 'fullbody';
        let maxCount = 0;

        Object.entries(muscleGroupCounts).forEach(([group, count]) => {
          if (count > maxCount) {
            maxCount = count;
            primaryMuscleGroup = group;
          }
        });

        // Actualizar ejercicios con grupos musculares si no los tienen
        const updatedExercises = routineData.exercises.map((exercise: Exercise) => {
          if (!exercise.muscleGroup) {
            return {
              ...exercise,
              muscleGroup: detectMuscleGroup(exercise.name || '')
            };
          }
          return exercise;
        });

        // Actualizar la rutina
        await updateDoc(doc(db, 'routines', routineDoc.id), {
          primaryMuscleGroup,
          exercises: updatedExercises
        });

        console.log(`✅ Rutina "${routineData.name}" actualizada - Grupo principal: ${primaryMuscleGroup}`);
      }
    });

    await Promise.all(updatePromises);
    console.log('🎉 ¡Todas las rutinas han sido actualizadas!');

  } catch (error) {
    console.error('❌ Error al actualizar rutinas:', error);
    throw error;
  }
};

// Función para ejecutar manualmente desde la consola del navegador
declare global {
  interface Window {
    updateRoutinesWithMuscleGroups: () => Promise<void>;
  }
}

window.updateRoutinesWithMuscleGroups = updateExistingRoutinesWithMuscleGroups;