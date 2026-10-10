import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import type { SportSession } from '../../../shared/types';
import { SportSessionCard } from './SportSessionCard';

describe('SportSessionCard', () => {
  it('keeps delete and session details as independent accessible actions', () => {
    const session: SportSession = { id: 'one', userId: 'user', sportType: 'archery', sportName: 'Tiro con Arco', startedAt: new Date(2026, 5, 1), status: 'completed' };
    const onClick = vi.fn();
    const onDelete = vi.fn();
    const { container } = render(<SportSessionCard session={session} onClick={onClick} onDelete={onDelete} />);
    expect(container.querySelector('button button')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar sesión' }));
    expect(onDelete).toHaveBeenCalledWith('one');
    expect(onClick).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Ver sesión/ }));
    expect(onClick).toHaveBeenCalledWith(session);
  });
});
