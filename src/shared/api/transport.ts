import { fetchJson, getIdToken } from './apiClient';

export const getApiOrigin = (): string => {
  const configuredOrigin = import.meta.env.VITE_PUSH_API_ORIGIN;
  if (typeof configuredOrigin !== 'string' || !configuredOrigin.trim()) {
    throw new Error('VITE_PUSH_API_ORIGIN is required. Configure it before starting Herculito.');
  }
  const origin = configuredOrigin.trim();
  return origin.replace(/\/+$/, '');
};

const getApiUrl = (path: string): string => {
  return `${getApiOrigin()}${path.startsWith('/') ? path : `/${path}`}`;
};

const withJsonContentType = (init?: RequestInit): Headers => {
  const headers = new Headers(init?.headers);
  if (init?.body != null && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  return headers;
};

export const fetchPublicApiJson = async <T = unknown>(path: string, init?: RequestInit): Promise<T> => {
  return fetchJson<T>(getApiUrl(path), {
    ...init,
    headers: withJsonContentType(init)
  });
};

export const fetchApiJson = async <T = unknown>(path: string, init?: RequestInit): Promise<T> => {
  const token = await getIdToken();
  const headers = withJsonContentType(init);
  headers.set('authorization', `Bearer ${token}`);

  return fetchJson<T>(getApiUrl(path), {
    ...init,
    headers
  });
};
