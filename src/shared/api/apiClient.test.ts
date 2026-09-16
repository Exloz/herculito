import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiError, fetchJson, isApiError, setTokenGetter, getIdToken } from './apiClient';

describe('apiClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setTokenGetter(null);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    setTokenGetter(null);
  });

  describe('ApiError', () => {
    it('creates ApiError with message and status', () => {
      const error = new ApiError('Not found', { status: 404 });
      expect(error.message).toBe('Not found');
      expect(error.status).toBe(404);
      expect(error.name).toBe('ApiError');
    });

    it('creates ApiError with code and details', () => {
      const details = { reason: 'test' };
      const error = new ApiError('Conflict', { status: 409, code: 'routine_id_conflict', details });
      expect(error.code).toBe('routine_id_conflict');
      expect(error.details).toBe(details);
    });
  });

  describe('isApiError', () => {
    it('returns true for ApiError instances', () => {
      const error = new ApiError('test', { status: 500 });
      expect(isApiError(error)).toBe(true);
    });

    it('returns false for non-ApiError instances', () => {
      expect(isApiError(new Error('test'))).toBe(false);
      expect(isApiError(null)).toBe(false);
      expect(isApiError({})).toBe(false);
    });
  });

  describe('setTokenGetter and getIdToken', () => {
    it('uses token getter when set', async () => {
      setTokenGetter(() => Promise.resolve('custom-token'));
      const token = await getIdToken();
      expect(token).toBe('custom-token');
    });

    it('returns token from token getter', async () => {
      const getter = vi.fn().mockResolvedValue('test-token');
      setTokenGetter(getter);
      const token = await getIdToken();
      expect(token).toBe('test-token');
      expect(getter).toHaveBeenCalledTimes(1);
    });

    it('throws when token getter returns null', async () => {
      setTokenGetter(() => Promise.resolve(null));
      await expect(getIdToken()).rejects.toThrow('Not authenticated');
    });
  });

  describe('fetchJson retries', () => {
    it('retries a GET after a network failure', async () => {
      const fetchMock = vi.fn()
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
          headers: { 'content-type': 'application/json' }
        }));
      vi.stubGlobal('fetch', fetchMock);

      const request = fetchJson<{ ok: boolean }>('/test');
      await vi.advanceTimersByTimeAsync(250);

      await expect(request).resolves.toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('retries configured statuses and honors bounded Retry-After', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(new Response(null, {
          status: 503,
          headers: { 'retry-after': '30' }
        }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
          headers: { 'content-type': 'application/json' }
        }));
      vi.stubGlobal('fetch', fetchMock);

      const request = fetchJson<{ ok: boolean }>('/test');
      await vi.advanceTimersByTimeAsync(4999);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);

      await expect(request).resolves.toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('does not retry non-configured HTTP failures', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Missing' }), {
        status: 404,
        headers: { 'content-type': 'application/json' }
      }));
      vi.stubGlobal('fetch', fetchMock);

      await expect(fetchJson('/test')).rejects.toMatchObject({ status: 404 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not retry invalid response bodies', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response('{', {
        headers: { 'content-type': 'application/json' }
      }));
      vi.stubGlobal('fetch', fetchMock);

      await expect(fetchJson('/test')).rejects.toBeInstanceOf(SyntaxError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not retry network failures for mutation requests', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new TypeError('Network error'));
      vi.stubGlobal('fetch', fetchMock);

      await expect(fetchJson('/test', { method: 'POST' })).rejects.toThrow('Network error');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
