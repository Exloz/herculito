import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  deleteDoc,
  increment,
  type DocumentData,
  type QuerySnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Routine, ExerciseHistory, Exercise, MuscleGroup } from '../types';
import { getCurrentDateString } from '../utils/dateUtils';

export const useRoutines = (userId: string) => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initializedDefaultsRef = useRef(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const routinesRef = collection(db, 'routines');

    let mineByCreatedBy: Routine[] = [];
    let mineByUserId: Routine[] = [];
    let publicByTrue: Routine[] = [];
    let publicByMissing: Routine[] = [];

    let initialSnapshotsRemaining = 4;

    const toJsDate = (value: unknown): Date | undefined => {
      if (!value) return undefined;
      if (value instanceof Date) return value;
      const maybe = value as { toDate?: () => Date };
      if (typeof maybe.toDate === 'function') return maybe.toDate();
      return undefined;
    };

    const mapSnapshot = (snapshot: QuerySnapshot<DocumentData>): Routine[] => {
      return (snapshot as QuerySnapshot<DocumentData>).docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: toJsDate(data.createdAt),
          updatedAt: toJsDate(data.updatedAt),
        };
      }) as Routine[];
    };

    const updateCombined = () => {
      const byId = new Map<string, Routine>();
      [...publicByMissing, ...publicByTrue, ...mineByUserId, ...mineByCreatedBy].forEach((routine) => {
        byId.set(routine.id, routine);
      });

      const combined = Array.from(byId.values());

      combined.sort((a, b) => {
        const aIsUser = a.createdBy === userId || a.userId === userId;
        const bIsUser = b.createdBy === userId || b.userId === userId;

        if (aIsUser && !bIsUser) return -1;
        if (bIsUser && !aIsUser) return 1;

        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

      setRoutines(combined);

      if (initialSnapshotsRemaining === 0) {
        setLoading(false);
        const hasUserRoutines = combined.some((routine) => routine.createdBy === userId || routine.userId === userId);
        if (!hasUserRoutines && !initializedDefaultsRef.current) {
          initializedDefaultsRef.current = true;
          setTimeout(() => {
            void initializeDefaultRoutines();
          }, 0);
        }
      }
    };

    const handleInitialSnapshot = () => {
      if (initialSnapshotsRemaining > 0) {
        initialSnapshotsRemaining -= 1;
        if (initialSnapshotsRemaining === 0) {
          updateCombined();
        }
      }
    };

    const unsubMineByCreatedBy = onSnapshot(
      query(routinesRef, where('createdBy', '==', userId)),
      (snapshot) => {
        mineByCreatedBy = mapSnapshot(snapshot);
        handleInitialSnapshot();
        updateCombined();
      },
      (err) => {
        setError('Error al cargar rutinas: ' + err.message);
        setLoading(false);
      }
    );

    const unsubMineByUserId = onSnapshot(
      query(routinesRef, where('userId', '==', userId)),
      (snapshot) => {
        mineByUserId = mapSnapshot(snapshot);
        handleInitialSnapshot();
        updateCombined();
      },
      (err) => {
        setError('Error al cargar rutinas: ' + err.message);
        setLoading(false);
      }
    );

    const unsubPublicByTrue = onSnapshot(
      query(routinesRef, where('isPublic', '==', true)),
      (snapshot) => {
        publicByTrue = mapSnapshot(snapshot);
        handleInitialSnapshot();
        updateCombined();
      },
      (err) => {
        setError('Error al cargar rutinas: ' + err.message);
        setLoading(false);
      }
    );

    const unsubPublicByMissing = onSnapshot(
      query(routinesRef, where('isPublic', '==', null)),
      (snapshot) => {
        publicByMissing = mapSnapshot(snapshot);
        handleInitialSnapshot();
        updateCombined();
      },
      (err) => {
        setError('Error al cargar rutinas: ' + err.message);
        setLoading(false);
      }
    );

    return () => {
      unsubMineByCreatedBy();
      unsubMineByUserId();
      unsubPublicByTrue();
      unsubPublicByMissing();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const createRoutine = useCallback(async (name: string, description: string, exercises: Exercise[], isPublic: boolean = true, primaryMuscleGroup?: MuscleGroup, createdByName?: string) => {
    const routine: Omit<Routine, 'id'> = {
      name,
      description,
      exercises,
      createdBy: userId,
      createdByName: createdByName || 'Usuario',
      isPublic,
      timesUsed: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      primaryMuscleGroup
    };

    const routinesRef = collection(db, 'routines');
    const docRef = await addDoc(routinesRef, routine);

    return docRef.id;
  }, [userId]);

  const updateRoutine = useCallback(async (routineId: string, updates: Partial<Routine>) => {
    const routineRef = doc(db, 'routines', routineId);
    await updateDoc(routineRef, {
      ...updates,
      updatedAt: new Date(),
    });
  }, []);

  const deleteRoutine = async (routineId: string) => {
    const routineRef = doc(db, 'routines', routineId);
    await deleteDoc(routineRef);
  };

  // Función para incrementar el contador de uso cuando alguien ejecuta una rutina
  const incrementRoutineUsage = async (routineId: string) => {
    const routineRef = doc(db, 'routines', routineId);
    await updateDoc(routineRef, {
      timesUsed: increment(1)
    });
  };

  // Verificar si el usuario actual es el creador de la rutina
  const canEditRoutine = (routine: Routine): boolean => {
    return routine.createdBy === userId || routine.userId === userId;
  };

  // Obtener rutinas públicas vs propias
  const getPublicRoutines = (): Routine[] => {
    return routines.filter(r => {
      const isPublic = r.isPublic !== false; // true si es undefined o true
      const isFromOtherUser = (r.createdBy && r.createdBy !== userId) || (r.userId && r.userId !== userId);
      // If there is no owner metadata, treat as community/public.
      const hasKnownOwner = !!r.createdBy || !!r.userId;
      return isPublic && (!hasKnownOwner || isFromOtherUser);
    });
  };

  const getUserRoutines = (): Routine[] => {
    return routines.filter(r =>
      r.createdBy === userId || r.userId === userId
    );
  };

  const initializeDefaultRoutines = async () => {
    const defaultRoutines = [
      {
        name: 'Pecho y Tríceps',
        description: 'Rutina enfocada en pecho y tríceps',
        exercises: [
          { id: 'bench_press', name: 'Press de Banca', sets: 4, reps: 8, restTime: 180 },
          { id: 'incline_press', name: 'Press Inclinado', sets: 3, reps: 10, restTime: 120 },
          { id: 'flyes', name: 'Aperturas con Mancuernas', sets: 3, reps: 12, restTime: 90 },
          { id: 'tricep_dips', name: 'Fondos en Paralelas', sets: 3, reps: 12, restTime: 90 },
          { id: 'tricep_extension', name: 'Extensión de Tríceps', sets: 3, reps: 15, restTime: 60 }
        ]
      },
      {
        name: 'Espalda y Bíceps',
        description: 'Rutina enfocada en espalda y bíceps',
        exercises: [
          { id: 'pull_ups', name: 'Dominadas', sets: 4, reps: 8, restTime: 180 },
          { id: 'barbell_rows', name: 'Remo con Barra', sets: 4, reps: 10, restTime: 120 },
          { id: 'lat_pulldown', name: 'Jalones al Pecho', sets: 3, reps: 12, restTime: 90 },
          { id: 'bicep_curls', name: 'Curl de Bíceps', sets: 3, reps: 12, restTime: 90 },
          { id: 'hammer_curls', name: 'Curl Martillo', sets: 3, reps: 15, restTime: 60 }
        ]
      },
      {
        name: 'Piernas',
        description: 'Rutina completa de piernas',
        exercises: [
          { id: 'squats', name: 'Sentadillas', sets: 4, reps: 10, restTime: 180 },
          { id: 'deadlifts', name: 'Peso Muerto', sets: 4, reps: 8, restTime: 180 },
          { id: 'leg_press', name: 'Prensa de Piernas', sets: 3, reps: 15, restTime: 120 },
          { id: 'leg_curls', name: 'Curl de Femorales', sets: 3, reps: 12, restTime: 90 },
          { id: 'calf_raises', name: 'Elevación de Gemelos', sets: 4, reps: 20, restTime: 60 }
        ]
      },
      {
        name: 'Hombros',
        description: 'Rutina enfocada en hombros',
        exercises: [
          { id: 'overhead_press', name: 'Press Militar', sets: 4, reps: 10, restTime: 120 },
          { id: 'lateral_raises', name: 'Elevaciones Laterales', sets: 3, reps: 15, restTime: 60 },
          { id: 'rear_delt_fly', name: 'Vuelos Posteriores', sets: 3, reps: 15, restTime: 60 },
          { id: 'upright_rows', name: 'Remo al Mentón', sets: 3, reps: 12, restTime: 60 }
        ]
      }
    ];

    try {
      for (const routine of defaultRoutines) {
        await createRoutine(routine.name, routine.description, routine.exercises, true, undefined, 'Sistema'); // Públicas por defecto
      }
    } catch {
      // Error silenciado para inicialización por defecto
    }
  };

  return {
    routines,
    loading,
    error,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    incrementRoutineUsage,
    canEditRoutine,
    getPublicRoutines,
    getUserRoutines,
    initializeDefaultRoutines
  };
};


export const useExerciseHistory = (userId: string) => {
  const [history, setHistory] = useState<ExerciseHistory[]>([]);

  useEffect(() => {
    if (!userId) return;

    const historyRef = collection(db, 'exerciseHistory');
    const q = query(historyRef, where('userId', '==', userId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as unknown as ExerciseHistory[];

      setHistory(historyData);
    });

    return () => unsubscribe();
  }, [userId]);

  const updateExerciseHistory = async (
    exerciseId: string,
    exerciseName: string,
    weights: number[],
    personalRecord: number
  ) => {
    try {
      const historyRef = doc(db, 'exerciseHistory', `${exerciseId}_${userId}`);
      await setDoc(historyRef, {
        exerciseId,
        exerciseName,
        userId,
        lastWeight: weights,
        lastDate: getCurrentDateString(),
        personalRecord,
      }, { merge: true });
    } catch {
      // Error silenciado para historial de ejercicios
    }
  };

  const getExerciseHistory = (exerciseId: string): ExerciseHistory | undefined => {
    return history.find(h => h.exerciseId === exerciseId);
  };

  return {
    history,
    updateExerciseHistory,
    getExerciseHistory
  };
};
