interface ClerkSessionLike {
  getToken: (options?: { template?: string }) => Promise<string | null>;
}

interface ClerkLike {
  session: ClerkSessionLike | null;
}

const getClerkInstance = (): ClerkLike | null => {
  if (typeof window === 'undefined') return null;

  const maybeClerk = (window as Window & { Clerk?: ClerkLike }).Clerk;
  if (!maybeClerk || typeof maybeClerk !== 'object') return null;

  return maybeClerk;
};

export const getIdToken = async (): Promise<string> => {
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
  const res = await fetch(url, init);
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`);
    }
    throw new Error('Invalid response type');
  }
  const data = (await res.json()) as T;
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return data;
};
