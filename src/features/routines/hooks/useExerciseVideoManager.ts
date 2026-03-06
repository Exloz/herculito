import { useMemo, useState } from 'react';
import type { ExerciseTemplate, ExerciseVideo } from '../../../shared/types';
import type { MusclewikiSuggestion } from '../api/musclewikiApi';
import { fetchMusclewikiSuggestions, fetchMusclewikiVideos } from '../api/musclewikiApi';
import { toUserMessage } from '../../../shared/lib/errorMessages';
import { runWithConcurrency } from '../../../shared/lib/promisePool';
import { countTemplatesMissingVideo, resolveExerciseVideo } from '../lib/exerciseVideo';

interface UseExerciseVideoManagerOptions {
  exercises: ExerciseTemplate[];
  userId?: string;
  updateExerciseTemplate: (exerciseId: string, updates: Partial<ExerciseTemplate>) => Promise<void>;
}

export const useExerciseVideoManager = ({
  exercises,
  userId,
  updateExerciseTemplate
}: UseExerciseVideoManagerOptions) => {
  const [videoSuggestions, setVideoSuggestions] = useState<MusclewikiSuggestion[]>([]);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<ExerciseVideo | null>(null);
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillMessage, setBackfillMessage] = useState('');

  const ownVideoCandidates = useMemo(() => {
    return countTemplatesMissingVideo(exercises, userId);
  }, [exercises, userId]);

  const clearVideoSelection = () => {
    setVideoSuggestions([]);
    setSelectedVideo(null);
    setVideoError('');
  };

  const handleSuggestVideos = async (exerciseName: string) => {
    if (!exerciseName.trim()) {
      setVideoError('Escribe un nombre para buscar videos');
      return;
    }

    setVideoLoading(true);
    setVideoError('');
    setVideoSuggestions([]);
    setSelectedVideo(null);

    try {
      const suggestions = await fetchMusclewikiSuggestions(exerciseName, 5);
      setVideoSuggestions(suggestions);
      if (suggestions.length === 0) {
        setVideoError('No se encontraron sugerencias para este nombre');
      }
    } catch (error) {
      setVideoError(toUserMessage(error, 'No pudimos buscar videos en este momento'));
    } finally {
      setVideoLoading(false);
    }
  };

  const handlePickSuggestion = async (suggestion: MusclewikiSuggestion) => {
    setVideoLoading(true);
    setVideoError('');

    try {
      const data = await fetchMusclewikiVideos(suggestion.slug);
      setSelectedVideo({
        provider: 'musclewiki',
        slug: suggestion.slug,
        url: data.defaultVideoUrl,
        pageUrl: data.pageUrl,
        variants: data.variants
      });
    } catch (error) {
      setVideoError(toUserMessage(error, 'No pudimos obtener el video seleccionado'));
    } finally {
      setVideoLoading(false);
    }
  };

  const handleBackfillVideos = async () => {
    if (!userId || backfillRunning) return;

    const candidates = exercises.filter((exercise) => exercise.createdBy === userId);
    const missingVideoCandidates = candidates.filter((exercise) => countTemplatesMissingVideo([exercise], userId) > 0);

    if (missingVideoCandidates.length === 0) {
      setBackfillMessage('No hay ejercicios sin video para actualizar');
      return;
    }

    let processed = 0;
    setBackfillRunning(true);
    setBackfillMessage(`Buscando videos... (0/${missingVideoCandidates.length})`);

    try {
      const results = await runWithConcurrency<ExerciseTemplate, 'updated' | 'skipped' | 'failed'>(
        missingVideoCandidates,
        3,
        async (exercise) => {
          try {
            const video = await resolveExerciseVideo(exercise);
            if (!video) {
              return 'skipped';
            }

            await updateExerciseTemplate(exercise.id, { video });
            return 'updated';
          } catch {
            return 'failed';
          } finally {
            processed += 1;
            setBackfillMessage(`Buscando videos... (${processed}/${missingVideoCandidates.length})`);
          }
        }
      );

      const updated = results.filter((result) => result === 'updated').length;
      const skipped = results.filter((result) => result === 'skipped').length;
      const failed = results.filter((result) => result === 'failed').length;

      const parts = [`${updated} actualizados`, `${skipped} omitidos`];
      if (failed > 0) parts.push(`${failed} errores`);
      setBackfillMessage(`Listo: ${parts.join(', ')}.`);
    } finally {
      setBackfillRunning(false);
    }
  };

  return {
    videoSuggestions,
    videoLoading,
    videoError,
    selectedVideo,
    setSelectedVideo,
    backfillRunning,
    backfillMessage,
    ownVideoCandidates,
    clearVideoSelection,
    handleSuggestVideos,
    handlePickSuggestion,
    handleBackfillVideos,
    setVideoError,
    setVideoSuggestions
  };
};
