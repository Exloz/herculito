import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPreviewFixtures } from '../../../app/preview/previewFixtures';
import { WeeklyPlanSummary } from './WeeklyPlanSummary';

const routines = createPreviewFixtures().routines;
const props = {
  routines, plan: { wednesday: routines[0].id, thursday: routines[1].id, saturday: null },
  today: 'wednesday' as const, editing: false, onEdit: vi.fn()
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-28T15:00:00Z'));
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('compact weekly plan', () => {
  it('starts on today and consults another day without editing or losing the today marker', () => {
    render(<WeeklyPlanSummary {...props} />);
    const today = screen.getByRole('button', { name: /^Miércoles, 28 de octubre, hoy/ });
    const tomorrow = screen.getByRole('button', { name: /^Jueves, 29 de octubre/ });
    expect(today.getAttribute('aria-pressed')).toBe('true');
    expect(within(screen.getByRole('status')).getByText('Pecho y tríceps')).toBeTruthy();
    fireEvent.click(tomorrow);
    expect(tomorrow.getAttribute('aria-pressed')).toBe('true');
    expect(today.getAttribute('aria-pressed')).toBe('false');
    expect(today.getAttribute('aria-current')).toBe('date');
    expect(tomorrow.hasAttribute('aria-current')).toBe(false);
    const detail = screen.getByRole('status');
    expect(document.getElementById(tomorrow.getAttribute('aria-controls')!)).toBe(detail);
    expect(within(detail).getByText('Día de piernas')).toBeTruthy();
    expect(within(detail).getByText('2 ejercicios · 6 series')).toBeTruthy();
    expect(props.onEdit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Editar semana' }));
    expect(props.onEdit).toHaveBeenCalledOnce();
  });

  it('shows complete routine names and actual counts, including singular and empty routines', () => {
    const name = 'Home Guide By Mady · fuerza, estabilidad y movilidad de todo el cuerpo';
    const routine = { ...routines[0], name, exercises: [{ ...routines[0].exercises[0], sets: 1 }] };
    const { rerender } = render(<WeeklyPlanSummary {...props} routines={[routine]} />);
    const detail = screen.getByRole('status');
    expect(within(detail).getByText(name)).toBeTruthy();
    expect(within(detail).getByText('1 ejercicio · 1 serie')).toBeTruthy();
    rerender(<WeeklyPlanSummary {...props} routines={[{ ...routine, exercises: [] }]} />);
    expect(within(detail).getByText('0 ejercicios · 0 series')).toBeTruthy();
  });

  it('distinguishes rest, unplanned and unavailable assignments without substituting a routine', () => {
    render(<WeeklyPlanSummary {...props} plan={{ ...props.plan, sunday: 'removed' }} />);
    for (const [day, title, note] of [
      ['Sábado', 'Descanso', 'Recuperación prevista en tu plan.'],
      ['Viernes', 'Sin plan', 'Todavía sin rutina asignada.'],
      ['Domingo', 'Rutina no disponible', 'Activa la rutina en la biblioteca o cambia la asignación en Editar semana.']
    ]) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${day},`) }));
      expect(within(screen.getByRole('status')).getByText(title)).toBeTruthy();
      expect(within(screen.getByRole('status')).getByText(note)).toBeTruthy();
    }
    expect(props.onEdit).not.toHaveBeenCalled();
  });

  it('keeps the consulted day and updates its details when the plan or library changes', () => {
    const { rerender } = render(<WeeklyPlanSummary {...props} />);
    const thursday = screen.getByRole('button', { name: /^Jueves,/ });
    fireEvent.click(thursday);
    rerender(<WeeklyPlanSummary {...props} plan={{ ...props.plan, thursday: null }} editing />);
    expect(thursday.getAttribute('aria-pressed')).toBe('true');
    expect(within(screen.getByRole('status')).getByText('Descanso')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Editar semana' }).getAttribute('aria-expanded')).toBe('true');
    rerender(<WeeklyPlanSummary {...props} routines={[routines[0]]} />);
    expect(within(screen.getByRole('status')).getByText('Rutina no disponible')).toBeTruthy();
  });

  it('supports arrow keys, Home and End while keeping focus and selection together', () => {
    render(<WeeklyPlanSummary {...props} />);
    const dayButtons = within(screen.getByRole('group', { name: 'Consultar plan semanal' })).getAllByRole('button');
    fireEvent.keyDown(dayButtons[2], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(dayButtons[3]);
    expect(dayButtons[3].getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyDown(dayButtons[3], { key: 'End' });
    expect(document.activeElement).toBe(dayButtons[6]);
    fireEvent.keyDown(dayButtons[6], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(dayButtons[0]);
    fireEvent.keyDown(dayButtons[0], { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(dayButtons[6]);
    fireEvent.keyDown(dayButtons[6], { key: 'Home' });
    expect(document.activeElement).toBe(dayButtons[0]);
    expect(props.onEdit).not.toHaveBeenCalled();
  });

  it('uses the app timezone across the Sunday/Monday boundary and resets selection for the new week', () => {
    vi.setSystemTime(new Date('2026-11-02T04:30:00Z')); // Still Sunday in Bogotá.
    const { rerender } = render(<WeeklyPlanSummary {...props} today="sunday" />);
    const rail = screen.getByRole('group', { name: 'Consultar plan semanal' });
    expect([...rail.querySelectorAll('time')].map((time) => time.dateTime)).toEqual([
      '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'
    ]);
    fireEvent.click(screen.getByRole('button', { name: /^Miércoles,/ }));
    vi.setSystemTime(new Date('2026-11-02T05:01:00Z'));
    rerender(<WeeklyPlanSummary {...props} today="monday" />);
    expect(screen.getByRole('button', { name: /^Lunes, 2 de noviembre, hoy/ }).getAttribute('aria-pressed')).toBe('true');
    expect(within(screen.getByRole('status')).getByText('Lunes, 2 de noviembre · Hoy')).toBeTruthy();
  });

  it('resets a stale selection when the app resumes a week later on the same weekday', () => {
    const { rerender } = render(<WeeklyPlanSummary {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /^Lunes,/ }));
    vi.setSystemTime(new Date('2026-11-04T15:00:00Z'));
    rerender(<WeeklyPlanSummary {...props} />);
    expect(screen.getByRole('button', { name: /^Miércoles, 4 de noviembre, hoy/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('only prompts horizontal scrolling when the week does not fit', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(320);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(280);
    const { unmount } = render(<WeeklyPlanSummary {...props} />);
    expect(screen.getByText('Desliza para ver todos los días')).toBeTruthy();
    unmount();
    vi.restoreAllMocks();
    render(<WeeklyPlanSummary {...props} />);
    expect(screen.queryByText('Desliza para ver todos los días')).toBeNull();
  });
});
