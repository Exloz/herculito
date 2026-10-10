// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parse } from 'postcss';
import { Navigation } from './Navigation';
import appStyles from '../../index.css?raw';

const mocks = vi.hoisted(() => ({
  dismissFailed: vi.fn(),
  retryFailed: vi.fn(),
  syncPending: vi.fn().mockResolvedValue(undefined),
  setOwner: vi.fn(),
  replayPending: vi.fn().mockResolvedValue(undefined),
  projection: {
    active: null as { kind: 'workout' } | null,
    pendingSyncCount: 0,
    failedSyncCount: 1,
    syncError: 'Ya existe otra actividad activa en el servidor.',
    syncFailureAction: 'dismiss' as 'dismiss' | 'retry',
    nextRetryAtMs: null
  }
}));

vi.mock('../../features/activity-sync/useActivitySync', () => ({
  useActivitySync: () => ({
    activitySync: {
      dismissFailed: mocks.dismissFailed,
      retryFailed: mocks.retryFailed,
      syncPending: mocks.syncPending
    },
    projection: mocks.projection
  })
}));

vi.mock('../../features/workouts/lib/remoteTimerScheduler', () => ({
  remoteTimerScheduler: {
    setOwner: mocks.setOwner,
    replayPending: mocks.replayPending
  }
}));

describe('Navigation synchronization failure action', () => {
  afterEach(() => vi.unstubAllGlobals());

  beforeEach(() => {
    vi.stubGlobal('localStorage', { setItem: vi.fn() });
    vi.clearAllMocks();
    mocks.projection.syncFailureAction = 'dismiss';
    mocks.projection.active = null;
  });

  it('keeps the same navigation destinations when a workout becomes active', () => {
    const onPageChange = vi.fn();
    const { rerender } = render(
      <Navigation currentPage="routines" onPageChange={onPageChange} isAdmin={false} userId="user-1" />
    );
    const destinations = () => Array.from(screen.getByRole('navigation').querySelectorAll('button'))
      .map((button) => button.getAttribute('aria-label'));
    const before = destinations();
    mocks.projection.active = { kind: 'workout' };
    rerender(<Navigation currentPage="routines" onPageChange={onPageChange} isAdmin={false} userId="user-1" />);
    expect(destinations()).toEqual(before);
    fireEvent.click(screen.getByRole('button', { name: 'Reanudar entrenamiento activo' }));
    expect(onPageChange).toHaveBeenCalledWith('dashboard');
    fireEvent.click(screen.getByRole('button', { name: 'Ir a Mis medidas' }));
    expect(onPageChange).toHaveBeenCalledWith('profile');
  });

  it('acknowledges an active-activity conflict instead of retrying it', () => {
    render(
      <Navigation
        currentPage="dashboard"
        onPageChange={vi.fn()}
        isAdmin={false}
        userId="user-1"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Entendido/ }));

    expect(mocks.dismissFailed).toHaveBeenCalledTimes(1);
    expect(mocks.retryFailed).not.toHaveBeenCalled();
  });

  it('explicitly retries an actionable failed command', () => {
    mocks.projection.syncFailureAction = 'retry';
    render(
      <Navigation
        currentPage="dashboard"
        onPageChange={vi.fn()}
        isAdmin={false}
        userId="user-1"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }));

    expect(mocks.retryFailed).toHaveBeenCalledTimes(1);
    expect(mocks.syncPending).toHaveBeenCalledTimes(1);
  });

  it('does not keep the fixed bar transformed while visible', () => {
    render(
      <Navigation
        currentPage="dashboard"
        onPageChange={vi.fn()}
        isAdmin={false}
        userId="user-1"
      />
    );

    const container = screen.getByRole('navigation').closest('.app-bottom-nav');
    expect(container?.classList.contains('translate-y-0')).toBe(false);
    expect(container?.classList.contains('translate-y-6')).toBe(false);

    fireEvent(window, new CustomEvent('app-navigation-visibility', {
      detail: { hidden: true }
    }));
    expect(container?.classList.contains('translate-y-6')).toBe(false);
    expect(container?.classList.contains('opacity-0')).toBe(true);
    expect(container?.classList.contains('invisible')).toBe(true);

    fireEvent(window, new CustomEvent('app-navigation-visibility', {
      detail: { hidden: false }
    }));
    expect(container?.classList.contains('invisible')).toBe(false);
    expect(container?.classList.contains('opacity-100')).toBe(true);
  });

  it('disables hidden navigation descendants while a dialog is open', () => {
    const style = document.createElement('style');
    style.textContent = '.pointer-events-auto { pointer-events: auto; }';
    const stylesheet = parse(appStyles);
    stylesheet.walkRules((rule) => {
      if (rule.selector.includes('body.dialog-open .app-bottom-nav')) {
        style.textContent += rule.toString();
      }
    });
    render(
      <Navigation currentPage="routines" onPageChange={vi.fn()} isAdmin={false} userId="user-1" />
    );
    const nav = screen.getByRole('navigation');
    const container = nav.closest('.app-bottom-nav')!;
    const home = screen.getByRole('button', { name: 'Ir a Inicio' });
    try {
      document.body.classList.add('dialog-open');
      document.head.appendChild(style);
      expect(getComputedStyle(container).visibility).toBe('hidden');
      expect(getComputedStyle(nav).pointerEvents).toBe('none');
      expect(getComputedStyle(home).pointerEvents).toBe('none');
    } finally {
      document.body.classList.remove('dialog-open');
      style.remove();
    }
  });
});
