// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invalidateBrowserProjections } from './browserActivitySync';

describe('browser activity cache invalidation', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value)
    });
    Object.defineProperty(window, 'localStorage', { configurable: true, value: localStorage });
    localStorage.clear();
  });

  it('marks last-known-good dashboard and sports entries stale without deleting data', () => {
    localStorage.setItem('dashboard-data-cache', JSON.stringify({
      'user-1': { savedAt: 10, data: { summary: { totalWorkouts: 2 } } }
    }));
    localStorage.setItem('sports-data-cache', JSON.stringify({
      'user-1': { savedAt: 10, sessions: [{ id: 'sport-1' }], stats: { totalSessions: 1 } }
    }));

    invalidateBrowserProjections('user-1');

    expect(JSON.parse(localStorage.getItem('dashboard-data-cache') ?? '{}')['user-1']).toMatchObject({
      stale: true,
      data: { summary: { totalWorkouts: 2 } }
    });
    expect(JSON.parse(localStorage.getItem('sports-data-cache') ?? '{}')['user-1']).toMatchObject({
      stale: true,
      sessions: [{ id: 'sport-1' }]
    });
  });
});
