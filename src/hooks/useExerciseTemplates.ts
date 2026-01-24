import { useState, useEffect, useRef } from 'react';
import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  query,
  updateDoc,
  increment,
  where,
  type DocumentData,
  type QuerySnapshot
} from 'firebase/firestore';
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
  const initializedDefaultsRef = useRef(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const exercisesRef = collection(db, 'exerciseTemplates');
    setLoading(true);
    setError(null);

    let mine: ExerciseTemplate[] = [];
    let publicByTrue: ExerciseTemplate[] = [];
    let publicByMissing: ExerciseTemplate[] = [];
    let initialSnapshotsRemaining = 3;

    const toJsDate = (value: unknown): Date | undefined => {
      if (!value) return undefined;
      if (value instanceof Date) return value;
      const maybe = value as { toDate?: () => Date };
      if (typeof maybe.toDate === 'function') return maybe.toDate();
      return undefined;
    };

    const mapSnapshot = (snapshot: QuerySnapshot<DocumentData>): ExerciseTemplate[] => {
      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: toJsDate(data.createdAt) ?? new Date(),
        };
      }) as ExerciseTemplate[];
    };

    const updateCombined = () => {
      const byId = new Map<string, ExerciseTemplate>();
      [...publicByMissing, ...publicByTrue, ...mine].forEach((exercise) => {
        byId.set(exercise.id, exercise);
      });

      const combined = Array.from(byId.values());
      combined.sort((a, b) => {
        if (a.createdBy === userId && b.createdBy !== userId) return -1;
        if (b.createdBy === userId && a.createdBy !== userId) return 1;
        return (b.timesUsed || 0) - (a.timesUsed || 0);
      });

      setExercises(combined);

      if (initialSnapshotsRemaining === 0) {
        setLoading(false);
        if (!initializedDefaultsRef.current && !combined.some((ex) => ex.isPublic)) {
          initializedDefaultsRef.current = true;
          setTimeout(() => {
            void initializeBasicExercises();
          }, 0);
        }
      }
    };

    const handleInitialSnapshot = () => {
      if (initialSnapshotsRemaining > 0) {
        initialSnapshotsRemaining -= 1;
      }
    };

    const unsubMine = onSnapshot(
      query(exercisesRef, where('createdBy', '==', userId)),
      (snapshot) => {
        mine = mapSnapshot(snapshot);
        handleInitialSnapshot();
        updateCombined();
      },
      () => {
        setError('Error al cargar ejercicios');
        setLoading(false);
      }
    );

    const unsubPublicTrue = onSnapshot(
      query(exercisesRef, where('isPublic', '==', true)),
      (snapshot) => {
        publicByTrue = mapSnapshot(snapshot);
        handleInitialSnapshot();
        updateCombined();
      },
      () => {
        setError('Error al cargar ejercicios');
        setLoading(false);
      }
    );

    const unsubPublicMissing = onSnapshot(
      query(exercisesRef, where('isPublic', '==', null)),
      (snapshot) => {
        publicByMissing = mapSnapshot(snapshot);
        handleInitialSnapshot();
        updateCombined();
      },
      () => {
        setError('Error al cargar ejercicios');
        setLoading(false);
      }
    );

    return () => {
      unsubMine();
      unsubPublicTrue();
      unsubPublicMissing();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
     } catch {
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
     } catch {
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
