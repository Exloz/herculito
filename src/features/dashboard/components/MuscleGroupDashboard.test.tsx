import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPreviewFixtures, PREVIEW_USER } from '../../../app/preview/previewFixtures';
import { MuscleGroupDashboard } from './MuscleGroupDashboard';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

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

  it('exposes hidden groups, updates scroll hints at the ends, and respects reduced motion', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(800);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);
    const scrollBy = vi.fn();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    const { routines } = createPreviewFixtures(false, new Date(), true);
    render(<MuscleGroupDashboard routines={routines} currentUser={PREVIEW_USER}
      onStartWorkout={vi.fn()} onRoutineMuscleGroupChange={vi.fn()} />);
    const rail = screen.getByRole('group', { name: 'Filtrar rutinas por grupo muscular' });
    rail.scrollBy = scrollBy;
    expect(screen.getByText('Desliza para explorar')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Ver grupos anteriores' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver más grupos musculares' }));
    expect(scrollBy).toHaveBeenCalledWith({ left: 210, behavior: 'instant' });
    rail.scrollLeft = 500;
    fireEvent.scroll(rail);
    expect(screen.queryByRole('button', { name: 'Ver más grupos musculares' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver grupos anteriores' }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -210, behavior: 'instant' });
  });

  it('omits scroll hints when all groups fit and preserves public authorship', () => {
    const { routines } = createPreviewFixtures();
    render(<MuscleGroupDashboard routines={routines} currentUser={PREVIEW_USER}
      onStartWorkout={vi.fn()} onRoutineMuscleGroupChange={vi.fn()} />);
    expect(screen.queryByText('Desliza para explorar')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ver más grupos musculares' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Full Body/ }));
    expect(screen.getByText('Por Equipo Herculito')).toBeVisible();
    expect(screen.getByText('Pública')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Ver ejercicios' }));
    expect(screen.getByText('Press de banca')).toBeVisible();
  });

  it('reveals a keyboard-focused group without selecting it and falls back when the selected group disappears', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(800);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);
    const { routines } = createPreviewFixtures();
    const props = { currentUser: PREVIEW_USER, onStartWorkout: vi.fn(), onRoutineMuscleGroupChange: vi.fn() };
    const { rerender } = render(<MuscleGroupDashboard routines={routines} {...props} />);
    const fullBody = screen.getByRole('button', { name: /^Full Body/ });
    Object.defineProperty(fullBody, 'offsetLeft', { value: 600 });
    Object.defineProperty(fullBody, 'offsetWidth', { value: 110 });
    vi.spyOn(fullBody, 'matches').mockImplementation((selector) => selector === ':focus-visible');
    fireEvent.focus(fullBody);
    expect(screen.getByRole('group', { name: 'Filtrar rutinas por grupo muscular' }).scrollLeft).toBe(458);
    expect(fullBody).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(fullBody);
    expect(screen.getByRole('heading', { name: 'Full body esencial' })).toBeVisible();
    rerender(<MuscleGroupDashboard routines={[routines[1]]} {...props} />);
    expect(screen.getByRole('button', { name: /^Piernas/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Día de piernas' })).toBeVisible();
  });

});
