import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPreviewFixtures } from '../../../app/preview/previewFixtures';
import { DashboardOverview } from './DashboardOverview';

afterEach(cleanup);

const summary = { totalWorkouts: 8, thisWeekWorkouts: 3, thisMonthWorkouts: 4,
  currentStreak: 0, longestStreak: 1, averageDurationMin: 42 };
const handlers = () => ({ onStart: vi.fn(), onContinue: vi.fn(), onCancel: vi.fn(), onNavigateToRoutines: vi.fn(), onChooseRoutine: vi.fn(), onAssignDay: vi.fn() });
const planProps = { routines: createPreviewFixtures().routines, weeklyPlan: {}, today: 'monday' as const };

describe('dashboard training priority', () => {
  it('keeps the weekly disclosure label while expanding and collapsing', () => {
    render(<DashboardOverview userName="Alex" summary={summary} {...planProps}
      plannedRoutine={planProps.routines[0]} {...handlers()} />);
    const toggle = screen.getByRole('button', { name: 'Mi semana' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Mi semana' })).toBe(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getAllByRole('combobox')).toHaveLength(7);
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('starts the planned routine directly', () => {
    const actions = handlers();
    const routine = createPreviewFixtures().routines[0];
    render(<DashboardOverview userName="Alex López" summary={summary} {...planProps} plannedRoutine={routine} {...actions} />);
    fireEvent.click(screen.getByRole('button', { name: 'Empezar entrenamiento' }));
    expect(actions.onStart).toHaveBeenCalledWith(routine.id);
  });

  it('offers to fix an empty planned routine instead of starting an empty workout', () => {
    const actions = handlers();
    const routine = { ...createPreviewFixtures().routines[0], exercises: [] };
    render(<DashboardOverview userName="Alex" summary={summary} {...planProps} plannedRoutine={routine} {...actions} />);
    expect(screen.getByText('Esta rutina aún no tiene ejercicios. Añádelos en tu biblioteca para empezar.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Empezar entrenamiento' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Revisar rutina' }));
    expect(actions.onNavigateToRoutines).toHaveBeenCalledOnce();
    expect(actions.onStart).not.toHaveBeenCalled();
  });

  it('prioritizes continuing an active workout over starting another', () => {
    const actions = handlers();
    render(<DashboardOverview userName="Alex" summary={summary} activeRoutineName="Mi sesión"
      {...planProps} plannedRoutine={createPreviewFixtures().routines[0]} {...actions} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar entrenamiento' }));
    expect(actions.onContinue).toHaveBeenCalledOnce();
    expect(actions.onStart).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Empezar entrenamiento' })).toBeNull();
  });

  it('provides an actionable empty state', () => {
    const actions = handlers();
    render(<DashboardOverview userName="Alex" summary={summary} {...planProps} {...actions} />);
    expect(screen.getByText('Hoy sin plan')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Elegir rutina' }));
    expect(actions.onChooseRoutine).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Planificar semana' }));
    expect(screen.getAllByRole('combobox')).toHaveLength(7);
  });

  it('offers planning when the library is empty', () => {
    render(<DashboardOverview userName="Alex" summary={summary} {...planProps} routines={[]} {...handlers()} />);
    expect(screen.queryByRole('button', { name: 'Elegir rutina' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Planificar semana' }));
    expect(screen.getAllByRole('combobox')).toHaveLength(7);
  });

  it('lets mobile users expand and collapse the activity summary', () => {
    render(<DashboardOverview userName="Alex" summary={summary} {...planProps} {...handlers()} />);
    const toggle = screen.getByText('Resumen').closest('button')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    const metrics = document.getElementById(toggle.getAttribute('aria-controls')!);
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(metrics?.dataset.expanded).toBe('true');
    fireEvent.click(toggle);
    expect(metrics?.dataset.expanded).toBe('false');
  });

  it('shows explicit rest without suggesting a routine', () => {
    render(<DashboardOverview userName="Alex" summary={summary} {...planProps} weeklyPlan={{ monday: null }} {...handlers()} />);
    expect(screen.getByText('Día de descanso')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Empezar entrenamiento' })).toBeNull();
  });

  it('does not silently substitute a missing routine', () => {
    const actions = handlers();
    render(<DashboardOverview userName="Alex" summary={summary} {...planProps} weeklyPlan={{ monday: 'removed' }} {...actions} />);
    expect(screen.getByRole('heading', { name: 'Rutina no disponible' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Planificar semana' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Lunes Hoy' }), { target: { value: planProps.routines[0].id } });
    expect(actions.onAssignDay).toHaveBeenCalledWith('monday', planProps.routines[0].id);
    fireEvent.change(screen.getByRole('combobox', { name: 'Martes' }), { target: { value: '__rest__' } });
    expect(actions.onAssignDay).toHaveBeenCalledWith('tuesday', null);
    fireEvent.click(within(screen.getByRole('group', { name: 'Mi semana' })).getByRole('button', { name: 'Gestionar rutinas' }));
    expect(actions.onNavigateToRoutines).toHaveBeenCalledOnce();
  });
});
