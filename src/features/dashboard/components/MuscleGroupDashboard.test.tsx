import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPreviewFixtures, PREVIEW_USER } from '../../../app/preview/previewFixtures';
import { MuscleGroupDashboard } from './MuscleGroupDashboard';

afterEach(cleanup);

describe('agenda routine selection', () => {
  it('shows actual exercise and set counts, discloses details and starts the chosen routine', () => {
    const { routines } = createPreviewFixtures();
    const onStart = vi.fn();
    render(<MuscleGroupDashboard routines={routines} currentUser={PREVIEW_USER}
      onStartWorkout={onStart} onRoutineMuscleGroupChange={vi.fn()} />);
    expect(screen.getByText('3 ejercicios')).toBeVisible();
    expect(screen.getByText('9 series')).toBeVisible();
    expect(screen.queryByText('Press de banca')).toBeNull();
    const details = screen.getByRole('button', { name: 'Ver ejercicios' });
    fireEvent.click(details);
    expect(details).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(details.getAttribute('aria-controls')!)).toContainElement(screen.getByText('Press de banca'));
    fireEvent.click(screen.getByRole('button', { name: 'Empezar Pecho y tríceps' }));
    expect(onStart).toHaveBeenCalledWith(routines[0].id);
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar ejercicios' }));
    expect(screen.queryByText('Press de banca')).toBeNull();
  });

  it('updates the selected group and starts that group’s routine', () => {
    const { routines } = createPreviewFixtures();
    const onStart = vi.fn();
    render(<MuscleGroupDashboard routines={routines} currentUser={PREVIEW_USER}
      onStartWorkout={onStart} onRoutineMuscleGroupChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /^Piernas/ }));
    expect(screen.getByRole('button', { name: /^Piernas/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('6 series')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Pecho y tríceps' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Empezar Día de piernas' }));
    expect(onStart).toHaveBeenCalledWith(routines[1].id);
  });

  it('does not start a routine without exercises', () => {
    const routine = { ...createPreviewFixtures().routines[0], exercises: [] };
    const onStart = vi.fn();
    render(<MuscleGroupDashboard routines={[routine]} currentUser={PREVIEW_USER}
      onStartWorkout={onStart} onRoutineMuscleGroupChange={vi.fn()} />);
    const start = screen.getByRole('button', { name: 'Empezar Pecho y tríceps' });
    expect(start).toBeDisabled();
    fireEvent.click(start);
    expect(onStart).not.toHaveBeenCalled();
  });
});
