import { useState, useEffect } from 'react';
import { collection, doc, addDoc, onSnapshot, query, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface ExerciseTemplate {
  id: string;
  name: string;
  category: string;
  sets: number;
  reps: number;
  restTime: number;
  description?: string;
  createdBy: string; // userId del creador
  isPublic: boolean; // si es público para todos los usuarios
  createdAt: Date;
  timesUsed: number; // cuántas veces se ha usado
}

export const useExerciseTemplates = (userId: string) => {
  const [exercises, setExercises] = useState<ExerciseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const exercisesRef = collection(db, 'exerciseTemplates');
    // Simplificar las consultas para evitar problemas de permisos e índices
    const allExercisesQuery = query(exercisesRef);

    const unsubscribe = onSnapshot(allExercisesQuery, (snapshot) => {
      
      const allExercises = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as ExerciseTemplate[];

      // Filtrar en el cliente: ejercicios públicos + ejercicios del usuario
      const filteredExercises = allExercises.filter(exercise => 
        exercise.isPublic || exercise.createdBy === userId
      );

      // Ordenar en el cliente: primero los del usuario, luego por uso
      filteredExercises.sort((a, b) => {
        // Priorizar ejercicios del usuario
        if (a.createdBy === userId && b.createdBy !== userId) return -1;
        if (b.createdBy === userId && a.createdBy !== userId) return 1;
        
        // Luego por número de usos
        return (b.timesUsed || 0) - (a.timesUsed || 0);
      });

      setExercises(filteredExercises);
      setLoading(false);
    }, () => {
      setError('Error al cargar ejercicios');
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  const createExerciseTemplate = async (
    name: string,
    category: string,
    sets: number,
    reps: number,
    restTime: number,
    description?: string,
    isPublic: boolean = false
  ) => {
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    try {
      const template: Omit<ExerciseTemplate, 'id'> = {
        name,
        category,
        sets,
        reps,
        restTime,
        description,
        createdBy: userId,
        isPublic,
        createdAt: new Date(),
        timesUsed: 0
      };

      const templatesRef = collection(db, 'exerciseTemplates');
      const docRef = await addDoc(templatesRef, template);
      
      return docRef.id;
    } catch (error) {
      setError('Error al crear ejercicio');
      throw error;
    }
  };

  const incrementUsage = async (exerciseId: string) => {
    try {
      const exerciseRef = doc(db, 'exerciseTemplates', exerciseId);
      // Incrementar timesUsed usando Firebase increment
      await updateDoc(exerciseRef, {
        timesUsed: increment(1)
      });
    } catch (error) {
      // Error silenciado para incremento de uso
    }
  };

  const getCategories = (): string[] => {
    const categories = [...new Set(exercises.map(ex => ex.category))].sort();
    return categories;
  };

  const getExercisesByCategory = (category: string): ExerciseTemplate[] => {
    return exercises.filter(ex => ex.category === category);
  };

  const searchExercises = (searchTerm: string, category?: string): ExerciseTemplate[] => {
    let filtered = exercises;
    
    if (category) {
      filtered = filtered.filter(ex => ex.category === category);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(ex => 
        ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  const initializeBasicExercises = async () => {
    // Solo inicializar si no hay ejercicios públicos
    if (exercises.some(ex => ex.isPublic)) return;

    const basicExercises = [
      { name: 'Press de Banca', category: 'Pecho', sets: 4, reps: 10, restTime: 120 },
      { name: 'Press Inclinado', category: 'Pecho', sets: 3, reps: 12, restTime: 90 },
      { name: 'Flexiones', category: 'Pecho', sets: 3, reps: 15, restTime: 60 },
      { name: 'Peso Muerto', category: 'Espalda', sets: 4, reps: 8, restTime: 150 },
      { name: 'Dominadas', category: 'Espalda', sets: 3, reps: 10, restTime: 90 },
      { name: 'Remo con Barra', category: 'Espalda', sets: 4, reps: 10, restTime: 90 },
      { name: 'Press Militar', category: 'Hombros', sets: 4, reps: 10, restTime: 120 },
      { name: 'Elevaciones Laterales', category: 'Hombros', sets: 3, reps: 15, restTime: 60 },
      { name: 'Sentadillas', category: 'Piernas', sets: 4, reps: 12, restTime: 120 },
      { name: 'Zancadas', category: 'Piernas', sets: 3, reps: 12, restTime: 90 },
      { name: 'Curl de Bíceps', category: 'Bíceps', sets: 3, reps: 12, restTime: 60 },
      { name: 'Fondos de Tríceps', category: 'Tríceps', sets: 3, reps: 15, restTime: 60 },
    ];

    try {
      for (const exercise of basicExercises) {
        await createExerciseTemplate(
          exercise.name,
          exercise.category,
          exercise.sets,
          exercise.reps,
          exercise.restTime,
          'Ejercicio básico',
          true // Público
        );
      }
    } catch (error) {
      // Error silenciado para ejercicios básicos
    }
  };

  return {
    exercises,
    loading,
    error,
    createExerciseTemplate,
    incrementUsage,
    getCategories,
    getExercisesByCategory,
    searchExercises,
    initializeBasicExercises
  };
};