import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { HiitConfig } from './HiitConfig';

describe('HiitConfig', () => {
  it('exposes a named dialog and starts the selected preset without rests when disabled', () => {
    const onStart = vi.fn();
    const onClose = vi.fn();
    render(<HiitConfig onStart={onStart} onClose={onClose} isStarting={false} />);
    expect(screen.getByRole('dialog', { name: 'Temporizador HIIT' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rápido 4 × 20s' }));
    expect(screen.getByRole('button', { name: 'Rápido 4 × 20s' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('switch', { name: 'Descanso entre intervalos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Comenzar' }));
    expect(onStart).toHaveBeenCalledWith({ intervals: 4, workDuration: 20, restEnabled: false, restDuration: 0 });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
