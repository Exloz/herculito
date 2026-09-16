import { fetchApiJson } from '../../../shared/api/transport';

export type MusclewikiSuggestion = {
  slug: string;
  displayName: string;
  score: number;
};

export type MusclewikiVideoVariant = {
  url: string;
  kind: string;
};

export type MusclewikiVideosResponse = {
  pageUrl: string;
  defaultVideoUrl: string;
  variants: MusclewikiVideoVariant[];
};

export const fetchMusclewikiSuggestions = async (
  query: string,
  limit = 5
): Promise<MusclewikiSuggestion[]> => {
  const data = await fetchApiJson<{ suggestions: MusclewikiSuggestion[] }>(
    '/v1/musclewiki/suggest',
    {
      method: 'POST',
      body: JSON.stringify({ query, limit })
    }
  );
  return data.suggestions ?? [];
};

export const fetchMusclewikiVideos = async (slug: string): Promise<MusclewikiVideosResponse> => {
  return fetchApiJson<MusclewikiVideosResponse>('/v1/musclewiki/videos', {
    method: 'POST',
    body: JSON.stringify({ slug })
  });
};
