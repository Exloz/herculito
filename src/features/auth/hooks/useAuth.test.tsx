import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { AuthContext, type AuthState } from './auth-context';
import { useAuth } from './useAuth';

describe('shared authentication state', () => {
  it('allows feature hooks to read the preview session without Clerk', () => {
    const auth: AuthState = {
      user: { id: 'preview-user', name: 'Alex', email: 'alex@example.test' },
      isAdmin: false, isAdminResolved: true, loading: false, error: null, logout: vi.fn()
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current).toBe(auth);
    expect(result.current.user?.id).toBe('preview-user');
  });
});
