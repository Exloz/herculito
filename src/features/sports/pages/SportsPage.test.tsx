import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { HiitConfig, User, SportSession } from '../../../shared/types';
import Sports from './SportsPage';

const mocks = vi.hoisted(() => ({
  showToast: vi.fn(),
  confirm: vi.fn(),
  refresh: vi.fn(),
  completeHiit: vi.fn(),
  startHiit: vi.fn(),
  syncPending: vi.fn().mockResolvedValue(undefined),
  completeActiveSession: vi.fn(),
  abandonSession: vi.fn(),
  addRound: vi.fn(),
  addEnd: vi.fn(),
  archeryState: {
    activeSession: null as SportSession | null,
    hasActiveSession: false,
  },
  activityProjection: {
    active: null as null | {
      kind: 'hiit';
      id: string;
      config: HiitConfig;
    },
    pendingSyncCount: 0
  }
}));

vi.mock('../../activity-sync/useActivitySync', () => ({
  useActivitySync: () => ({
    activitySync: {
      startHiit: mocks.startHiit,
      completeHiit: mocks.completeHiit,
      abandon: vi.fn(),
      syncPending: mocks.syncPending
    },
    projection: mocks.activityProjection
  })
}));

vi.mock('../../../app/providers/ui-context', () => ({
  useUI: () => ({
    showToast: mocks.showToast,
    confirm: mocks.confirm,
  }),
}));

vi.mock('../../../shared/hooks/useDelayedLoading', () => ({
  useDelayedLoading: () => false,
}));

vi.mock('../hooks/useSportSessions', () => ({
  useSportSessions: () => ({
    sessions: [],
    stats: null,
    loading: false,
    error: null,
    deleteSession: vi.fn(),
    refresh: mocks.refresh,
  }),
}));

const activeSession: SportSession = {
  id: 'session-1',
  userId: 'user-1',
  sportType: 'archery',
  sportName: 'Tiro con Arco',
  startedAt: new Date('2026-01-01T10:00:00Z'),
  status: 'active',
  archeryData: {
    bowType: 'recurve',
    arrowsUsed: 12,
    rounds: [],
    totalScore: 0,
    maxPossibleScore: 0,
    averageArrow: 0,
    goldCount: 0,
  },
};

vi.mock('../hooks/useActiveArcherySession', () => ({
  useActiveArcherySession: () => ({
    activeSession: mocks.archeryState.activeSession,
    hasActiveSession: mocks.archeryState.hasActiveSession,
    startSession: vi.fn(),
    addRound: mocks.addRound,
    addEnd: mocks.addEnd,
    completeSession: mocks.completeActiveSession,
    abandonSession: mocks.abandonSession,
  }),
}));

vi.mock('../components/hiit/HiitConfig', () => ({
  HiitConfig: ({ onStart }: { onStart: (config: HiitConfig) => Promise<void> }) => (
    <div>
      <button
        type="button"
        onClick={() => void onStart({ intervals: 8, workDuration: 30, restEnabled: true, restDuration: 15 })}
      >
        Iniciar HIIT mock
      </button>
    </div>
  ),
}));

vi.mock('../components/hiit/HiitActive', () => ({
  HiitActive: ({ onComplete, onAbandon }: { onComplete: () => void; onAbandon: () => void }) => (
    <div>
      <button type="button" onClick={onComplete}>Completar HIIT mock</button>
      <button type="button" onClick={onAbandon}>Abandonar HIIT mock</button>
    </div>
  ),
}));

vi.mock('../components/archery/ArcherySession', () => ({
  ArcherySession: ({ onComplete, onBack }: { onComplete: (notes?: string) => Promise<void>; onBack: () => void }) => (
    <div>
      <button type="button" onClick={() => void onComplete('nota-final')}>Completar mock</button>
      <button type="button" onClick={onBack}>Cerrar resumen mock</button>
    </div>
  ),
}));

describe('SportsPage', () => {
  const user: User = {
    id: 'user-1',
    email: 'archer@example.com',
    name: 'Archer One',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.archeryState.activeSession = activeSession;
    mocks.archeryState.hasActiveSession = true;
    mocks.activityProjection.active = null;
    mocks.completeActiveSession.mockResolvedValue(undefined);
    mocks.startHiit.mockImplementation((config: HiitConfig) => {
      const activity = { kind: 'hiit' as const, id: 'hiit-session-1', config };
      mocks.activityProjection.active = activity;
      return activity;
    });
  });

  it('completes the active session only through the active session hook', async () => {
    render(<Sports user={user} />);

    fireEvent.click(screen.getByRole('button', { name: /completar mock/i }));

    await waitFor(() => {
      expect(mocks.completeActiveSession).toHaveBeenCalledWith('nota-final');
    });

    expect(mocks.completeHiit).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it('clears the completed in-memory session when leaving the summary', () => {
    render(<Sports user={user} />);

    fireEvent.click(screen.getByRole('button', { name: /cerrar resumen mock/i }));

    expect(mocks.abandonSession).toHaveBeenCalledTimes(1);
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it('completes HIIT through activity synchronization when timer finishes', async () => {
    mocks.archeryState.activeSession = null;
    mocks.archeryState.hasActiveSession = false;

    render(<Sports user={user} />);

    fireEvent.click(screen.getByRole('button', { name: /hiit/i }));
    fireEvent.click(screen.getByRole('button', { name: /iniciar hiit mock/i }));

    await waitFor(() => {
      expect(mocks.startHiit).toHaveBeenCalledWith({
        intervals: 8,
        workDuration: 30,
        restEnabled: true,
        restDuration: 15,
      });
    });

    fireEvent.click(screen.getByRole('button', { name: /completar hiit mock/i }));

    await waitFor(() => {
      expect(mocks.completeHiit).toHaveBeenCalledWith('hiit-session-1');
    });

    expect(mocks.showToast).toHaveBeenCalledWith('Sesión HIIT completada', 'success');
  });
});
