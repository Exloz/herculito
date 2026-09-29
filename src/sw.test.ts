import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('workbox-precaching', () => ({
  cleanupOutdatedCaches: vi.fn(),
  createHandlerBoundToURL: vi.fn(),
  precacheAndRoute: vi.fn()
}));
vi.mock('workbox-routing', () => ({
  NavigationRoute: vi.fn(),
  registerRoute: vi.fn()
}));

describe('rest timer push notifications', () => {
  const listeners = new Map<string, (event: PushEvent) => void>();
  const showNotification = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    vi.resetModules();
    listeners.clear();
    showNotification.mockClear();
    vi.stubGlobal('self', {
      __WB_MANIFEST: [],
      location: { origin: 'https://workout.example' },
      registration: { showNotification },
      addEventListener: (type: string, listener: (event: PushEvent) => void) => {
        listeners.set(type, listener);
      }
    });
    await import('./sw');
  });

  afterEach(() => vi.unstubAllGlobals());

  it('alerts for consecutive pushes even when Android still displays the previous rest', async () => {
    const deliver = async () => {
      const waitUntil = vi.fn();
      listeners.get('push')!({
        data: { json: () => ({ tag: 'rest-timer' }) },
        waitUntil
      } as unknown as PushEvent);
      await waitUntil.mock.calls[0][0];
    };

    await deliver();
    await deliver();

    expect(showNotification).toHaveBeenCalledTimes(2);
    for (const [, options] of showNotification.mock.calls) {
      expect(options).toMatchObject({ tag: 'rest-timer', renotify: true, silent: false });
    }
  });
});
