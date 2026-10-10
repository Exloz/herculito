import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import type { Exercise, ExerciseLog } from '../../../shared/types';
import { ExerciseCard } from './ExerciseCard';

const exercise: Exercise = {
  id: 'bench', name: 'Press de banca con mancuernas en banco inclinado',
  sets: 2, reps: 10, restTime: 60
};

const renderCard = (onStartTimer = vi.fn(), repsBySet?: number[]) => {
  function Harness() {
    const [log, setLog] = useState<ExerciseLog>({
      exerciseId: exercise.id, userId: 'user-1', date: '2026-10-10', sets: []
    });
    return <ExerciseCard exercise={{ ...exercise, repsBySet }} log={log} userId="user-1" onUpdateLog={setLog} onStartTimer={onStartTimer} previousWeights={[40, 45]} />;
  }
  return render(<Harness />);
};

describe('ExerciseCard set entry', () => {
  it('retains previous weights and only starts rest when completing a set', () => {
    const onStartTimer = vi.fn();
    renderCard(onStartTimer);
    expect(screen.getByRole('spinbutton', { name: 'Peso para serie 1' })).toHaveValue(40);
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar peso 2.5kg en serie 1' }));
    expect(screen.getByRole('spinbutton', { name: 'Peso para serie 1' })).toHaveValue(42.5);
    fireEvent.click(screen.getByRole('button', { name: 'Completar serie 1' }));
    expect(screen.getByRole('button', { name: 'Marcar serie 1 como incompleta' })).toHaveAttribute('aria-pressed', 'true');
    expect(onStartTimer).toHaveBeenCalledExactlyOnceWith(60);
    fireEvent.click(screen.getByRole('button', { name: 'Marcar serie 1 como incompleta' }));
    expect(onStartTimer).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Completar serie 1' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('preserves editable reps and clears an empty weight to zero on blur', () => {
    renderCard(vi.fn(), [10, 8]);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Reps para serie 2' }), { target: { value: '7' } });
    expect(screen.getByRole('spinbutton', { name: 'Reps para serie 2' })).toHaveValue(7);
    const weight = screen.getByRole('spinbutton', { name: 'Peso para serie 1' });
    fireEvent.change(weight, { target: { value: '' } });
    fireEvent.blur(weight);
    expect(weight).toHaveValue(0);
  });
});
