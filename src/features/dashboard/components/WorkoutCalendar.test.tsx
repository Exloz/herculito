import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { WorkoutCalendar } from './WorkoutCalendar';

describe('WorkoutCalendar', () => {
  it('starts weeks on Monday and shows the selected day activity', () => {
    render(<WorkoutCalendar currentMonth={new Date(2026, 5, 1)} onMonthChange={vi.fn()} calendar={[{
      date: '2026-06-01', workouts: [{ sessionId: 'one', routineName: 'Piernas', muscleGroup: 'piernas', activityKind: 'workout' }]
    }]} />);
    const day = screen.getByRole('button', { name: '1 de Junio de 2026, 1 sesión' });
    expect(screen.getAllByRole('button')[2]).toBe(day);
    fireEvent.click(day);
    expect(day).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByRole('region', { name: 'Sesiones del día' })).getByText('Piernas', { selector: '.font-semibold' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '2 de Junio de 2026, sin sesiones' }));
    expect(screen.getByText('No hay sesiones registradas este día.')).toBeInTheDocument();
  });

  it('does not skip February when navigating from January 31', () => {
    const onMonthChange = vi.fn();
    render(<WorkoutCalendar currentMonth={new Date(2026, 0, 31)} onMonthChange={onMonthChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    expect(onMonthChange).toHaveBeenCalledWith(new Date(2026, 1, 1));
  });
});
