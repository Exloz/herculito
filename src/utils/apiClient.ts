import { auth } from '../firebase/config';

export const getIdToken = async (): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }
  return user.getIdToken();
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
