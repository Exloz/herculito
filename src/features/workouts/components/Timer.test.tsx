import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmModal } from '../../../shared/ui/ConfirmModal';
import { Timer } from './Timer';

vi.mock('../hooks/useTimer', () => ({
  useTimer: () => ({
    timeLeft: 60,
    isActive: true,
    progress: 50,
    startTimer: vi.fn(),
    pauseTimer: vi.fn(),
    resetTimer: vi.fn(),
    formatTime: () => '01:00',
    requestPermission: vi.fn()
  })
}));

describe('Timer overlay layering', () => {
  it('keeps the body-portaled timer below confirmation backdrops', () => {
    const { container } = render(
      <>
        <ConfirmModal
          isOpen
          title="Finalizar entrenamiento"
          message="Quedan ejercicios sin completar."
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
        <Timer userId="user-1" onClose={vi.fn()} />
      </>
    );

    const timer = screen.getByRole('button', { name: 'Pausar temporizador' }).closest('.fixed');
    const backdrop = screen.getByRole('alertdialog').parentElement;
    expect(container.contains(timer)).toBe(false);
    expect(timer).toHaveClass('z-[45]');
    expect(backdrop).toHaveClass('z-50');
  });
});
