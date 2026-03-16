interface ClerkSessionLike {
  getToken: (options?: { template?: string }) => Promise<string | null>;
}

interface ClerkLike {
  session: ClerkSessionLike | null;
}

type TokenGetter = () => Promise<string | null>;

const DEFAULT_TIMEOUT_MS = 15000;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, options: { status: number; code?: string; details?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}

export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError;
};

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

const parseErrorResponse = async (res: Response): Promise<{ message?: string; code?: string; details?: unknown }> => {
  const contentType = res.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      const payload = (await res.json()) as unknown;
      if (payload && typeof payload === 'object') {
        const payloadRecord = payload as Record<string, unknown>;
        const code = typeof payloadRecord.error === 'string' ? payloadRecord.error : undefined;
        const message = typeof payloadRecord.message === 'string'
          ? payloadRecord.message
          : code;
        return { message, code, details: payloadRecord };
      }
    } catch {
      return {};
    }
  }

  try {
    const text = await res.text();
    if (text.trim().length > 0) {
      return { message: text.trim() };
    }
  } catch {
    return {};
  }

  return {};
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

        const parsedError = await parseErrorResponse(res);
        throw new ApiError(parsedError.message ?? `Request failed: ${res.status}`, {
          status: res.status,
          code: parsedError.code,
          details: parsedError.details
        });
      }

      // Handle empty responses (e.g., 204 No Content or empty body for DELETE)
      const contentLength = res.headers.get('content-length');
      const hasBody = contentLength ? parseInt(contentLength, 10) > 0 : true;

      if (!hasBody || res.status === 204) {
        return undefined as T;
      }

      if (!contentType.includes('application/json')) {
        throw new ApiError('Invalid response type', { status: 500 });
      }

      return (await res.json()) as T;
    } catch (error) {
      if (attempt < retries) {
        continue;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('Request timed out', { status: 408 });
      }
      throw error;
    } finally {
      globalThis.clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onAbort);
      }
    }
  }

  throw new ApiError('Request failed', { status: 0 });
};
