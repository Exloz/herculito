import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as apiClient from './apiClient';
import { fetchApiJson, fetchPublicApiJson, getApiOrigin } from './transport';

vi.mock('./apiClient', () => ({
  fetchJson: vi.fn(),
  getIdToken: vi.fn()
}));

describe('API transport', () => {
  const mockFetchJson = vi.mocked(apiClient.fetchJson);
  const mockGetIdToken = vi.mocked(apiClient.getIdToken);

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('VITE_PUSH_API_ORIGIN', ' https://api.test.com/ ');
    mockGetIdToken.mockResolvedValue('test-token');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('owns API origin and authenticated request headers', async () => {
    mockFetchJson.mockResolvedValue({ ok: true });

    await fetchApiJson('/v1/data/dashboard', {
      method: 'POST',
      headers: { 'x-request-id': 'request-1' },
      body: JSON.stringify({ refresh: true })
    });

    expect(getApiOrigin()).toBe('https://api.test.com');
    expect(mockFetchJson).toHaveBeenCalledWith(
      'https://api.test.com/v1/data/dashboard',
      expect.objectContaining({ method: 'POST' })
    );
    const requestInit = mockFetchJson.mock.calls[0]?.[1];
    const headers = new Headers(requestInit?.headers);
    expect(headers.get('authorization')).toBe('Bearer test-token');
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.get('x-request-id')).toBe('request-1');
  });

  it('supports public API requests without requesting a token', async () => {
    mockFetchJson.mockResolvedValue({ vapidPublicKey: 'key' });

    await fetchPublicApiJson('/v1/push/vapidPublicKey');

    expect(mockGetIdToken).not.toHaveBeenCalled();
    expect(mockFetchJson).toHaveBeenCalledWith(
      'https://api.test.com/v1/push/vapidPublicKey',
      expect.objectContaining({ headers: expect.any(Headers) })
    );
  });

  it('fails clearly when the API origin is not configured', () => {
    vi.stubEnv('VITE_PUSH_API_ORIGIN', '');

    expect(() => getApiOrigin()).toThrow(
      'VITE_PUSH_API_ORIGIN is required. Configure it before starting Herculito.'
    );
  });
});
