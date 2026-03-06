import { useState, useEffect } from 'react';
import { Workout } from '../../../shared/types';
import { useUI } from '../../../app/providers/ui-context';
import { fetchWorkouts, upsertWorkout } from '../../../shared/api/dataApi';
import { toUserMessage } from '../../../shared/lib/errorMessages';

export const useWorkouts = () => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useUI();

  useEffect(() => {
    const loadWorkouts = async () => {
      try {
        const data = await fetchWorkouts();
        setWorkouts(data);
      } catch (error) {
        const message = toUserMessage(error, 'Error al cargar entrenamientos');
        setError(message);
        showToast(message, 'error');
      } finally {
        setLoading(false);
      }
    };

    void loadWorkouts();
  }, [showToast]);

  const updateWorkout = async (workout: Workout) => {
    try {
      await upsertWorkout(workout);
      setWorkouts((prev) => prev.map((w) => (w.id === workout.id ? workout : w)));
    } catch (error) {
      const message = toUserMessage(error, 'Error al actualizar entrenamiento');
      setError(message);
      showToast(message, 'error');
    }
  };

  return { workouts, loading, error, updateWorkout };
};

export { useExerciseLogs } from './useExerciseLogs';
