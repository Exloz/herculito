import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { RoutineEditor } from './RoutineEditor';

vi.mock('../../auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } })
}));

vi.mock('../hooks/useExerciseTemplates', () => {
  const exercises = [{
    id: 'exercise-1', name: 'Press de banca', category: 'Pecho',
    sets: 3, reps: 10, restTime: 90, createdBy: 'user-1', timesUsed: 1
  }];
  return {
    useExerciseTemplates: () => ({
      exercises, loading: false,
      createExerciseTemplate: vi.fn(), updateExerciseTemplate: vi.fn(),
      incrementUsage: vi.fn(), getCategories: () => ['Pecho'],
      searchExercises: () => exercises
    })
  };
});

describe('RoutineEditor modal isolation', () => {
  it('keeps both dialogs outside page containment and saves after selecting an exercise', async () => {
    const onSave = vi.fn();
    const { container, unmount } = render(
      <div className="page-anim-enter-forward">
        <RoutineEditor onSave={onSave} onCancel={vi.fn()} />
      </div>
    );

    const editor = screen.getByRole('dialog', { name: 'Nueva rutina' });
    expect(container.contains(editor)).toBe(false);
    expect(editor.parentElement?.parentElement).toBe(document.body);
    expect(document.body).toHaveClass('dialog-open');
    fireEvent.change(screen.getByLabelText('Nombre de la rutina'), {
      target: { value: 'Rutina de prueba' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir ejercicio' }));

    const selector = await screen.findByRole('dialog', { name: 'Agregar ejercicio' });
    expect(selector.parentElement?.parentElement).toBe(document.body);
    expect(editor.parentElement?.contains(selector)).toBe(false);
    expect(selector.parentElement).not.toHaveClass('touch-none');
    fireEvent.click(screen.getByRole('button', { name: /Press de banca/ }));

    expect(screen.queryByRole('dialog', { name: 'Agregar ejercicio' })).toBeNull();
    expect(document.body).toHaveClass('dialog-open');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar rutina' }));
    expect(onSave).toHaveBeenCalledWith(
      'Rutina de prueba', '',
      [{ id: 'exercise-1', name: 'Press de banca', sets: 3, reps: 10, restTime: 90 }],
      false, 'fullbody'
    );
    unmount();
    expect(document.body).not.toHaveClass('dialog-open');
  });

  it('cancels the selector without closing the editor, then cancels the routine', async () => {
    const onCancel = vi.fn();
    render(<RoutineEditor onSave={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Añadir ejercicio' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar selector de ejercicios' }));
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Nueva rutina' })).toBeInTheDocument();
    expect(document.body).toHaveClass('dialog-open');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
