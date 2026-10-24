import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivitySyncStatus } from './ActivitySyncStatus';

const state = vi.hoisted(() => ({
  projection: { pendingSyncCount: 0, failedSyncCount: 0 },
  listeners: new Set<() => void>()
}));

vi.mock('./browserActivitySync', () => ({
  getBrowserActivityProjection: () => state.projection,
  subscribeBrowserActivitySync: (_userId: string, listener: () => void) => {
    state.listeners.add(listener);
    return () => state.listeners.delete(listener);
  }
}));

beforeEach(() => {
  state.projection = { pendingSyncCount: 0, failedSyncCount: 0 };
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('activity sync feedback', () => {
  it('only reports up to date when there are no queued or failed changes', () => {
    render(<ActivitySyncStatus userId="alex" />);
    expect(screen.getByRole('status').textContent).toBe('Todo al día');
  });

  it('distinguishes pending changes from a completed synchronization', () => {
    state.projection = { pendingSyncCount: 2, failedSyncCount: 0 };
    render(<ActivitySyncStatus userId="alex" />);
    expect(screen.getByRole('status').textContent).toBe('Por sincronizar');
    expect(screen.getByRole('status').title).toContain('este dispositivo');
  });

  it('prioritizes a failed change over other pending changes', () => {
    state.projection = { pendingSyncCount: 3, failedSyncCount: 1 };
    render(<ActivitySyncStatus userId="alex" />);
    expect(screen.getByRole('status').textContent).toBe('Revisar cambios');
  });

  it('reacts to losing and recovering connectivity', () => {
    render(<ActivitySyncStatus userId="alex" />);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    fireEvent(window, new Event('offline'));
    expect(screen.getByRole('status').textContent).toBe('Sin conexión');
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    fireEvent(window, new Event('online'));
    expect(screen.getByRole('status').textContent).toBe('Todo al día');
  });

  it('updates from the existing queue and releases its subscription on unmount', () => {
    const { unmount } = render(<ActivitySyncStatus userId="alex" />);
    act(() => {
      state.projection = { pendingSyncCount: 1, failedSyncCount: 0 };
      state.listeners.forEach((listener) => listener());
    });
    expect(screen.getByRole('status').textContent).toBe('Por sincronizar');
    act(() => {
      state.projection = { pendingSyncCount: 0, failedSyncCount: 0 };
      state.listeners.forEach((listener) => listener());
    });
    expect(screen.getByRole('status').textContent).toBe('Todo al día');
    unmount();
    expect(state.listeners.size).toBe(0);
  });
});
