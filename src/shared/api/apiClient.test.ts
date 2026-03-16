import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiError, isApiError, setTokenGetter, getIdToken } from './apiClient';

describe('apiClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setTokenGetter(null);
  });

  afterEach(() => {
    vi.useRealTimers();
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
});