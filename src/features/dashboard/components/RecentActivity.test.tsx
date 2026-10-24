import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DashboardRecentSession } from '../../../shared/types';
import { RecentActivity } from './RecentActivity';

afterEach(cleanup);

const sessions: DashboardRecentSession[] = Array.from({ length: 5 }, (_, index) => ({
  id: `session-${index}`, routineName: `Sesión ${index + 1}`, activityKind: 'workout',
  completedAt: new Date(`2026-10-${22 - index}T18:00:00Z`), totalDuration: 42
}));

describe('recent activity timeline', () => {
  it('shows the latest three sessions and lets the user expand and collapse all available entries', () => {
    render(<RecentActivity sessions={sessions} onExploreRoutines={vi.fn()} />);
    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(within(list).getByText('jueves, 22 de octubre')).toBeVisible();
    expect(within(list).getAllByRole('heading').map((heading) => heading.textContent)).toEqual(['Sesión 1', 'Sesión 2', 'Sesión 3']);
    const toggle = screen.getByRole('button', { name: 'Ver las 5 sesiones' });
    expect(toggle).toHaveAttribute('aria-controls', list.id);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar menos' }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
  });

  it('uses the application time zone and includes years when the timeline crosses a year boundary', () => {
    const boundarySessions: DashboardRecentSession[] = [
      { id: 'new', routineName: 'Nueva', completedAt: new Date('2026-01-01T08:00:00Z'), activityKind: 'workout', totalDuration: 0 },
      { id: 'old', routineName: 'Anterior', completedAt: new Date('2026-01-01T02:00:00Z'), activityKind: 'sport', sportType: 'hiit' }
    ];
    const { container } = render(<RecentActivity sessions={boundarySessions} onExploreRoutines={vi.fn()} />);
    expect(screen.getByText('miércoles, 31 de diciembre de 2025')).toBeVisible();
    expect(screen.getByText('jueves, 1 de enero de 2026')).toBeVisible();
    expect(screen.getByText('0 min')).toBeVisible();
    expect(container.querySelectorAll('.timeline-duration')).toHaveLength(1);
    expect(container.querySelector('time')).toHaveAttribute('datetime', '2026-01-01T08:00:00.000Z');
  });

  it('does not offer expansion when all entries are already visible', () => {
    render(<RecentActivity sessions={sessions.slice(0, 2)} onExploreRoutines={vi.fn()} />);
    expect(screen.getByText('octubre de 2026')).toBeVisible();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('offers an actionable empty state without dates or invented activity', () => {
    const onExplore = vi.fn();
    render(<RecentActivity sessions={[]} onExploreRoutines={onExplore} />);
    expect(screen.getByRole('heading', { name: 'Aún no hay actividad' })).toBeVisible();
    expect(screen.queryByRole('list')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Explorar rutinas' }));
    expect(onExplore).toHaveBeenCalledOnce();
  });
});
