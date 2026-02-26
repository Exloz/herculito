interface ClerkSessionLike {
  getToken: (options?: { template?: string }) => Promise<string | null>;
}

interface ClerkLike {
  session: ClerkSessionLike | null;
}

type TokenGetter = () => Promise<string | null>;

const DEFAULT_TIMEOUT_MS = 15000;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

let tokenGetter: TokenGetter | null = null;

export const setTokenGetter = (getter: TokenGetter | null): void => {
  tokenGetter = getter;
};

const getClerkInstance = (): ClerkLike | null => {
  if (typeof window === 'undefined') return null;

  const maybeClerk = (window as Window & { Clerk?: ClerkLike }).Clerk;
  if (!maybeClerk || typeof maybeClerk !== 'object') return null;

  return maybeClerk;
};

export const getIdToken = async (): Promise<string> => {
  if (tokenGetter) {
    const token = await tokenGetter();
    if (token) return token;
  }

  const clerk = getClerkInstance();
  const template = import.meta.env.VITE_CLERK_JWT_TEMPLATE || 'herculito_api';

  if (!clerk?.session?.getToken) {
    throw new Error('Not authenticated');
  }

  const templateToken = await clerk.session.getToken({ template });
  if (templateToken) return templateToken;

  const sessionToken = await clerk.session.getToken();
  if (sessionToken) return sessionToken;

  throw new Error('Not authenticated');
};

export const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const method = (init?.method ?? 'GET').toUpperCase();
  const retries = method === 'GET' || method === 'HEAD' ? 1 : 0;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    const externalSignal = init?.signal;

    const onAbort = () => {
      controller.abort();
    };

    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        externalSignal.addEventListener('abort', onAbort, { once: true });
      }
    }

    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal
      });

      const contentType = res.headers.get('content-type') ?? '';
      if (!res.ok) {
        const shouldRetry = RETRYABLE_STATUS_CODES.has(res.status) && attempt < retries;
        if (shouldRetry) {
          continue;
        }
        throw new Error(`Request failed: ${res.status}`);
      }

      if (!contentType.includes('application/json')) {
        throw new Error('Invalid response type');
      }

      return (await res.json()) as T;
    } catch (error) {
      if (attempt < retries) {
        continue;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    } finally {
      globalThis.clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onAbort);
      }
    }
  }

  throw new Error('Request failed');
};
