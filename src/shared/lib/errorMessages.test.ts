import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/apiClient';
import { toUserMessage } from './errorMessages';

describe('toUserMessage', () => {
  it('uses API code-specific messages when available', () => {
    const error = new ApiError('routine_id_conflict', {
      status: 409,
      code: 'routine_id_conflict'
    });

    expect(toUserMessage(error, 'fallback')).toBe('El identificador de la rutina ya está en uso.');
  });

  it('falls back to status message when code is missing', () => {
    const error = new ApiError('Request failed: 401', { status: 401 });
    expect(toUserMessage(error, 'fallback')).toBe('Tu sesión expiró. Inicia sesión nuevamente.');
  });

  it('returns fallback for unknown errors', () => {
    expect(toUserMessage(null, 'fallback')).toBe('fallback');
  });
});
