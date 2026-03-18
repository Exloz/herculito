import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { User, SportSession } from '../../../shared/types';
import Sports from './SportsPage';

const mocks = vi.hoisted(() => ({
  showToast: vi.fn(),
  confirm: vi.fn(),
  refresh: vi.fn(),
  apiCompleteSession: vi.fn(),
  completeActiveSession: vi.fn(),
  abandonSession: vi.fn(),
  addRound: vi.fn(),
  addEnd: vi.fn(),
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
    startSession: vi.fn(),
    completeSession: mocks.apiCompleteSession,
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
    activeSession,
    hasActiveSession: true,
    startSession: vi.fn(),
    addRound: mocks.addRound,
    addEnd: mocks.addEnd,
    completeSession: mocks.completeActiveSession,
    abandonSession: mocks.abandonSession,
  }),
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
    mocks.completeActiveSession.mockResolvedValue(undefined);
  });

  it('completes the active session only through the active session hook', async () => {
    render(<Sports user={user} />);

    fireEvent.click(screen.getByRole('button', { name: /completar mock/i }));

    await waitFor(() => {
      expect(mocks.completeActiveSession).toHaveBeenCalledWith('nota-final');
    });

    expect(mocks.apiCompleteSession).not.toHaveBeenCalled();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it('clears the completed in-memory session when leaving the summary', () => {
    render(<Sports user={user} />);

    fireEvent.click(screen.getByRole('button', { name: /cerrar resumen mock/i }));

    expect(mocks.abandonSession).toHaveBeenCalledTimes(1);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
});
