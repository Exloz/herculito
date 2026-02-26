import { fetchJson, getIdToken } from './apiClient';
import { getPushApiOrigin } from './pushApi';

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
  const origin = getPushApiOrigin();
  const token = await getIdToken();
  const data = await fetchJson<{ suggestions: MusclewikiSuggestion[] }>(
    `${origin}/v1/musclewiki/suggest`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ query, limit })
    }
  );
  return data.suggestions ?? [];
};

export const fetchMusclewikiVideos = async (slug: string): Promise<MusclewikiVideosResponse> => {
  const origin = getPushApiOrigin();
  const token = await getIdToken();
  return fetchJson<MusclewikiVideosResponse>(`${origin}/v1/musclewiki/videos`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ slug })
  });
};
