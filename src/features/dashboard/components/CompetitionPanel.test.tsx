import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { CompetitionPanel } from './CompetitionPanel';

describe('CompetitionPanel', () => {
  it('reduces an empty classification to a disclosure and reveals its explanation on request', () => {
    const { container } = render(<CompetitionPanel competition={{ weekLeader: null, monthLeader: null,
      userWeekRank: null, userMonthRank: null }} />);
    expect(screen.getByText('Aún sin clasificación')).toBeVisible();
    expect(screen.getByText(/Todavía no hay posiciones disponibles/)).not.toBeVisible();
    expect(container.querySelector('details')).not.toHaveAttribute('open');
    fireEvent.click(screen.getByText('Comunidad'));
    expect(container.querySelector('details')).toHaveAttribute('open');
    expect(screen.getByText(/Todavía no hay posiciones disponibles/)).toBeVisible();
  });

  it('distinguishes an unavailable classification from an empty one', () => {
    render(<CompetitionPanel />);
    expect(screen.getByText('Clasificación no disponible')).toBeVisible();
    expect(screen.queryByText('Aún sin clasificación')).toBeNull();
  });
  it('shows weekly and monthly leaders and the user rank without disclosure controls', () => {
    const { container } = render(<CompetitionPanel competition={{
      weekLeader: { userId: 'other', name: 'María', totalWorkouts: 5, position: 1 },
      monthLeader: { userId: 'self', name: 'Alex', totalWorkouts: 12, position: 1 },
      userWeekRank: { userId: 'self', name: 'Alex', totalWorkouts: 3, position: 2 },
      userMonthRank: { userId: 'self', name: 'Alex', totalWorkouts: 12, position: 1 }
    }} />);
    const week = within(screen.getByRole('region', { name: 'Ranking: Esta semana' }));
    expect(week.getByText('María')).toBeVisible();
    expect(week.getByText('#2')).toBeVisible();
    expect(week.getByText(/· 3 sesiones/)).toBeVisible();
    expect(screen.getByText('Alex · Tú')).toBeVisible();
    expect(container.querySelector('details')).toBeNull();
  });

  it('does not hide the user rank when there is no leader', () => {
    render(<CompetitionPanel competition={{ weekLeader: null, monthLeader: null,
      userWeekRank: { userId: 'self', name: 'Alex', totalWorkouts: 1, position: 3 }, userMonthRank: null }} />);
    expect(screen.getByText('#3')).toBeVisible();
    expect(screen.getByText(/· 1 sesión/)).toBeVisible();
    expect(screen.getByText('Tú · Sin posición')).toBeVisible();
  });
});
