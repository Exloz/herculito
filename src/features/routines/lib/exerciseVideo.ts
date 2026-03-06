import type { ExerciseTemplate, ExerciseVideo } from '../../../shared/types';
import { fetchMusclewikiSuggestions, fetchMusclewikiVideos } from '../api/musclewikiApi';

const MATCH_THRESHOLD = 0.45;

export const hasMissingExerciseVideo = (exercise: {
  name: string;
  video?: ExerciseVideo;
}): boolean => {
  if (!exercise.name.trim()) return false;
  if (!exercise.video) return true;
  return !exercise.video.variants || exercise.video.variants.length === 0;
};

const extractVideoSlug = (video?: ExerciseVideo): string | undefined => {
  return video?.slug
    || (video?.pageUrl?.includes('/exercise/')
      ? video.pageUrl.split('/exercise/')[1]?.split('/')[0]
      : undefined);
};

export const resolveExerciseVideo = async (exercise: {
  name: string;
  video?: ExerciseVideo;
}): Promise<ExerciseVideo | undefined> => {
  const existingSlug = extractVideoSlug(exercise.video);

  if (exercise.video && existingSlug && (!exercise.video.variants || exercise.video.variants.length === 0)) {
    const data = await fetchMusclewikiVideos(existingSlug);
    return {
      ...exercise.video,
      slug: existingSlug,
      url: exercise.video.url || data.defaultVideoUrl,
      pageUrl: exercise.video.pageUrl || data.pageUrl,
      variants: data.variants
    };
  }

  const suggestions = await fetchMusclewikiSuggestions(exercise.name, 5);
  const best = suggestions[0];
  if (!best || best.score < MATCH_THRESHOLD) {
    return undefined;
  }

  const data = await fetchMusclewikiVideos(best.slug);
  return {
    provider: 'musclewiki',
    slug: best.slug,
    url: data.defaultVideoUrl,
    pageUrl: data.pageUrl,
    variants: data.variants
  };
};

export const countExercisesMissingVideo = (exercises: Array<{ name: string; video?: ExerciseVideo }>): number => {
  return exercises.filter(hasMissingExerciseVideo).length;
};

export const countTemplatesMissingVideo = (
  exercises: ExerciseTemplate[],
  userId?: string
): number => {
  if (!userId) return 0;
  return exercises.filter((exercise) => exercise.createdBy === userId && hasMissingExerciseVideo(exercise)).length;
};

export const getVideoPreviewUrls = (video: ExerciseVideo) => {
  const variants = video.variants ?? [];
  const frontVariant = variants.find((variant) => variant.kind.includes('front'));
  const sideVariant = variants.find((variant) => variant.kind.includes('side'));
  const detectView = (url: string) => {
    if (url.includes('-front')) return 'front';
    if (url.includes('-side')) return 'side';
    return 'unknown';
  };

  const detectedView = detectView(video.url);
  const frontCandidate = frontVariant?.url ?? (detectedView === 'front' ? video.url : undefined);
  const sideCandidate = sideVariant?.url ?? (detectedView === 'side' ? video.url : undefined);
  const fallbackSource = frontCandidate ?? sideCandidate ?? video.url;

  const frontUrl = frontCandidate
    ?? (fallbackSource.includes('-side') ? fallbackSource.replace('-side', '-front') : fallbackSource);
  let sideUrl = sideCandidate
    ?? (fallbackSource.includes('-front') ? fallbackSource.replace('-front', '-side') : undefined);

  if (sideUrl === frontUrl) {
    sideUrl = undefined;
  }

  return { frontUrl, sideUrl };
};
