import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPreviewFixtures } from '../../../app/preview/previewFixtures';
import { DashboardOverview } from './DashboardOverview';

afterEach(cleanup);

const summary = { totalWorkouts: 8, thisWeekWorkouts: 3, thisMonthWorkouts: 4,
  currentStreak: 0, longestStreak: 1, averageDurationMin: 42 };
const handlers = () => ({ onStart: vi.fn(), onContinue: vi.fn(), onCancel: vi.fn(), onNavigateToRoutines: vi.fn() });

describe('dashboard training priority', () => {
  it('starts the suggested routine directly', () => {
    const actions = handlers();
    const routine = createPreviewFixtures().routines[0];
    render(<DashboardOverview userName="Alex López" summary={summary} recommendedRoutine={routine} {...actions} />);
    fireEvent.click(screen.getByRole('button', { name: 'Empezar entrenamiento' }));
    expect(actions.onStart).toHaveBeenCalledWith(routine.id);
  });

  it('prioritizes continuing an active workout over starting another', () => {
    const actions = handlers();
    render(<DashboardOverview userName="Alex" summary={summary} activeRoutineName="Mi sesión"
      recommendedRoutine={createPreviewFixtures().routines[0]} {...actions} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar entrenamiento' }));
    expect(actions.onContinue).toHaveBeenCalledOnce();
    expect(actions.onStart).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Empezar entrenamiento' })).toBeNull();
  });

  it('provides an actionable empty state', () => {
    const actions = handlers();
    render(<DashboardOverview userName="Alex" summary={summary} {...actions} />);
    fireEvent.click(screen.getByRole('button', { name: 'Explorar rutinas' }));
    expect(actions.onNavigateToRoutines).toHaveBeenCalledOnce();
  });
});
