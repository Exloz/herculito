import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ArcherySession } from './ArcherySession';
import type { SportSession } from '../../../../shared/types';

const uiMocks = vi.hoisted(() => ({
  showToast: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('../../../../app/providers/ui-context', () => ({
  useUI: () => ({
    showToast: uiMocks.showToast,
    confirm: uiMocks.confirm,
  }),
}));

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const buildSession = (): SportSession => ({
  id: 'session-1',
  userId: 'user-1',
  sportType: 'archery',
  sportName: 'Tiro con Arco',
  startedAt: new Date('2026-01-01T10:00:00Z'),
  status: 'active',
  archeryData: {
    bowType: 'recurve',
    arrowsUsed: 0,
    rounds: [
      {
        id: 'round-1',
        sessionId: 'session-1',
        distance: 70,
        targetSize: 122,
        arrowsPerEnd: 3,
        order: 1,
        ends: [],
        totalScore: 0,
        createdAt: new Date('2026-01-01T10:00:00Z'),
      },
    ],
    totalScore: 0,
    maxPossibleScore: 0,
    averageArrow: 0,
    goldCount: 0,
  },
});

describe('ArcherySession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces note persistence and keeps the latest local value', () => {
    vi.useFakeTimers();
    const onNotesChange = vi.fn();
    render(
      <ArcherySession
        session={buildSession()}
        onAddRound={vi.fn().mockResolvedValue(undefined)}
        onAddEnd={vi.fn().mockResolvedValue(undefined)}
        onComplete={vi.fn().mockResolvedValue(undefined)}
        onNotesChange={onNotesChange}
        onAbandon={vi.fn()}
        onBack={vi.fn()}
      />
    );

    const notesInput = screen.getByRole('textbox', { name: '' });
    fireEvent.change(notesInput, { target: { value: 'Club' } });
    act(() => vi.advanceTimersByTime(300));
    fireEvent.change(notesInput, { target: { value: 'Club, viento fuerte' } });
    act(() => vi.advanceTimersByTime(499));

    expect(notesInput).toHaveValue('Club, viento fuerte');
    expect(onNotesChange).not.toHaveBeenCalled();
    expect(localStorageMock.getItem('archery-notes-draft:session-1')).toBe('Club, viento fuerte');

    act(() => vi.advanceTimersByTime(1));

    expect(onNotesChange).toHaveBeenCalledTimes(1);
    expect(onNotesChange).toHaveBeenCalledWith('Club, viento fuerte');
    expect(localStorageMock.getItem('archery-notes-draft:session-1')).toBeNull();
  });

  it('flushes pending notes on blur', () => {
    vi.useFakeTimers();
    const onNotesChange = vi.fn();
    render(
      <ArcherySession
        session={buildSession()}
        onAddRound={vi.fn().mockResolvedValue(undefined)}
        onAddEnd={vi.fn().mockResolvedValue(undefined)}
        onComplete={vi.fn().mockResolvedValue(undefined)}
        onNotesChange={onNotesChange}
        onAbandon={vi.fn()}
        onBack={vi.fn()}
      />
    );

    const notesInput = screen.getByRole('textbox', { name: '' });
    fireEvent.change(notesInput, { target: { value: 'Club' } });
    fireEvent.blur(notesInput);

    expect(onNotesChange).toHaveBeenCalledTimes(1);
    expect(onNotesChange).toHaveBeenCalledWith('Club');
    act(() => vi.runAllTimers());
    expect(onNotesChange).toHaveBeenCalledTimes(1);
  });

  it('flushes pending notes before completing', async () => {
    vi.useFakeTimers();
    const onNotesChange = vi.fn();
    const onComplete = vi.fn().mockResolvedValue(undefined);
    render(
      <ArcherySession
        session={buildSession()}
        onAddRound={vi.fn().mockResolvedValue(undefined)}
        onAddEnd={vi.fn().mockResolvedValue(undefined)}
        onComplete={onComplete}
        onNotesChange={onNotesChange}
        onAbandon={vi.fn()}
        onBack={vi.fn()}
      />
    );

    fireEvent.change(screen.getByRole('textbox', { name: '' }), {
      target: { value: 'Última nota' },
    });
    fireEvent.click(screen.getByRole('button', { name: /completar sesión/i }));
    const confirmOptions = uiMocks.confirm.mock.calls[0][0] as {
      onConfirm: () => Promise<void>;
    };
    await act(() => confirmOptions.onConfirm());

    expect(onNotesChange).toHaveBeenCalledWith('Última nota');
    expect(onComplete).toHaveBeenCalledWith('Última nota');
    expect(onNotesChange.mock.invocationCallOrder[0]).toBeLessThan(
      onComplete.mock.invocationCallOrder[0]
    );
  });

  it('flushes pending notes on unmount', () => {
    vi.useFakeTimers();
    const onNotesChange = vi.fn();
    const { unmount } = render(
      <ArcherySession
        session={buildSession()}
        onAddRound={vi.fn().mockResolvedValue(undefined)}
        onAddEnd={vi.fn().mockResolvedValue(undefined)}
        onComplete={vi.fn().mockResolvedValue(undefined)}
        onNotesChange={onNotesChange}
        onAbandon={vi.fn()}
        onBack={vi.fn()}
      />
    );

    fireEvent.change(screen.getByRole('textbox', { name: '' }), {
      target: { value: 'Pendiente' },
    });
    unmount();

    expect(onNotesChange).toHaveBeenCalledTimes(1);
    expect(onNotesChange).toHaveBeenCalledWith('Pendiente');
  });

  it('keeps the end input open when add end fails', async () => {
    const onAddEnd = vi.fn().mockRejectedValue(new Error('save failed'));

    render(
      <ArcherySession
        session={buildSession()}
        onAddRound={vi.fn().mockResolvedValue(undefined)}
        onAddEnd={onAddEnd}
        onComplete={vi.fn().mockResolvedValue(undefined)}
        onAbandon={vi.fn()}
        onBack={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /agregar tanda/i }));

    const xButton = screen.getByRole('button', { name: /diez de oro/i });
    fireEvent.click(xButton);
    fireEvent.click(xButton);
    fireEvent.click(xButton);

    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(await screen.findByText(/No se pudo guardar la tanda/i)).toBeInTheDocument();
    expect(screen.getByText(/Nueva tanda/i)).toBeInTheDocument();

    const arrows = screen.getAllByLabelText(/flecha/i);
    expect(arrows[0]).toHaveTextContent('X');
    expect(arrows[1]).toHaveTextContent('X');
    expect(arrows[2]).toHaveTextContent('X');

    await waitFor(() => {
      expect(onAddEnd).toHaveBeenCalledTimes(1);
    });

    expect(uiMocks.showToast).toHaveBeenCalledWith(expect.any(String), 'error');
  });
});
