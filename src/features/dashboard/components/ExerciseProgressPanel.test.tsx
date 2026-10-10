import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import type { DashboardExerciseProgressSummary } from '../../../shared/types';
import { ExerciseProgressPanel } from './ExerciseProgressPanel';

vi.mock('../hooks/useExerciseNameMap', () => ({ useExerciseNameMap: () => new Map() }));

const buildSummary = (weights: number[], daysAgo = 0): DashboardExerciseProgressSummary => ({
  exerciseId: 'bench', exerciseName: 'Press de banca',
  points: weights.map((bestWeight, index) => ({
    timestamp: Date.now() - (daysAgo + weights.length - index - 1) * 86400000,
    bestWeight, completedSets: 3, totalWeight: bestWeight * 3
  })),
  totalSessions: weights.length, personalRecord: Math.max(...weights),
  lastWeight: weights[weights.length - 1], previousWeight: weights[weights.length - 2] ?? null,
  trend: 'neutral', lastCompletedAt: new Date(Date.now() - daysAgo * 86400000), weeklyVolumeKg: 0
});

describe('ExerciseProgressPanel interpretation', () => {
  it('does not describe a single session as a trend', () => {
    render(<ExerciseProgressPanel summaries={[buildSummary([40])]} />);
    expect(screen.getByText('Una sesión en este periodo. Necesitas otra para comparar la evolución del peso.')).toBeInTheDocument();
    expect(screen.getByText('Sin datos')).toBeInTheDocument();
  });

  it('explains which weights are compared across multiple sessions', () => {
    render(<ExerciseProgressPanel summaries={[buildSummary([40, 45])]} />);
    expect(screen.getByText(/El peso máximo por sesión pasó de/)).toBeInTheDocument();
    expect(screen.getByText(/no el volumen total ni las repeticiones/)).toBeInTheDocument();
  });

  it('identifies a latest all-time weight outside an empty selected period', () => {
    render(<ExerciseProgressPanel summaries={[buildSummary([40], 100)]} />);
    fireEvent.click(screen.getByRole('button', { name: /7d/ }));
    expect(screen.getByText('Último total')).toBeInTheDocument();
    expect(screen.getByText('No hay sesiones en este periodo. Amplía el rango para ver tus registros.')).toBeInTheDocument();
  });
});
