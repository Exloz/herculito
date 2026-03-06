import { useMemo, useState } from 'react';
import type { ExerciseVideo, Routine } from '../../../shared/types';
import { updateExerciseTemplate } from '../../../shared/api/dataApi';
import { runWithConcurrency } from '../../../shared/lib/promisePool';
import { countExercisesMissingVideo, hasMissingExerciseVideo, resolveExerciseVideo } from '../lib/exerciseVideo';

interface UseRoutineVideoBackfillOptions {
  routines: Routine[];
  canEditRoutine: (routine: Routine) => boolean;
  updateRoutine: (routineId: string, updates: Partial<Routine>) => Promise<void>;
}

type BackfillTask = {
  routineId: string;
  exercise: Routine['exercises'][number];
};

type BackfillResult = {
  routineId: string;
  exerciseId: string;
  status: 'updated' | 'skipped' | 'failed';
  video?: ExerciseVideo;
};

export const useRoutineVideoBackfill = ({
  routines,
  canEditRoutine,
  updateRoutine
}: UseRoutineVideoBackfillOptions) => {
  const [routineBackfillRunning, setRoutineBackfillRunning] = useState(false);
  const [routineBackfillMessage, setRoutineBackfillMessage] = useState('');

  const routinesMissingVideos = useMemo(() => {
    return routines.reduce((total, routine) => total + countExercisesMissingVideo(routine.exercises), 0);
  }, [routines]);

  const handleBackfillRoutineVideos = async () => {
    if (routineBackfillRunning) return;
    if (routines.length === 0) {
      setRoutineBackfillMessage('No tienes rutinas para actualizar');
      return;
    }

    const routinesToUpdate = routines.filter(canEditRoutine);
    const tasks: BackfillTask[] = routinesToUpdate.flatMap((routine) => {
      return routine.exercises
        .filter(hasMissingExerciseVideo)
        .map((exercise) => ({ routineId: routine.id, exercise }));
    });

    if (tasks.length === 0) {
      setRoutineBackfillMessage('No hay ejercicios sin video en tus rutinas');
      return;
    }

    let processed = 0;
    setRoutineBackfillRunning(true);
    setRoutineBackfillMessage(`Buscando videos... (0/${tasks.length})`);

    try {
      const results = await runWithConcurrency<BackfillTask, BackfillResult>(
        tasks,
        3,
        async (task) => {
          try {
            const video = await resolveExerciseVideo(task.exercise);
            if (!video) {
              return {
                routineId: task.routineId,
                exerciseId: task.exercise.id,
                status: 'skipped'
              };
            }

            await updateExerciseTemplate(task.exercise.id, { video });
            return {
              routineId: task.routineId,
              exerciseId: task.exercise.id,
              status: 'updated',
              video
            };
          } catch {
            return {
              routineId: task.routineId,
              exerciseId: task.exercise.id,
              status: 'failed'
            };
          } finally {
            processed += 1;
            setRoutineBackfillMessage(`Buscando videos... (${processed}/${tasks.length})`);
          }
        }
      );

      const videosByRoutine = new Map<string, Map<string, ExerciseVideo>>();
      let updated = 0;
      let skipped = 0;
      let failed = 0;

      results.forEach((result) => {
        if (result.status === 'updated' && result.video) {
          const byExerciseId = videosByRoutine.get(result.routineId) ?? new Map<string, ExerciseVideo>();
          byExerciseId.set(result.exerciseId, result.video);
          videosByRoutine.set(result.routineId, byExerciseId);
          updated += 1;
          return;
        }

        if (result.status === 'skipped') {
          skipped += 1;
          return;
        }

        failed += 1;
      });

      for (const routine of routinesToUpdate) {
        const routineVideos = videosByRoutine.get(routine.id);
        if (!routineVideos || routineVideos.size === 0) {
          continue;
        }

        const nextExercises = routine.exercises.map((exercise) => {
          const video = routineVideos.get(exercise.id);
          return video ? { ...exercise, video } : exercise;
        });

        await updateRoutine(routine.id, { exercises: nextExercises });
      }

      const parts = [`${updated} actualizados`, `${skipped} omitidos`];
      if (failed > 0) parts.push(`${failed} errores`);
      setRoutineBackfillMessage(`Listo: ${parts.join(', ')}.`);
    } finally {
      setRoutineBackfillRunning(false);
    }
  };

  return {
    routineBackfillRunning,
    routineBackfillMessage,
    routinesMissingVideos,
    handleBackfillRoutineVideos
  };
};
