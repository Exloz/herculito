import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { usePageNavigation } from './usePageNavigation';

afterEach(() => { cleanup(); window.history.replaceState({}, '', '/'); });

describe('workspace routes', () => {
  it.each(['progress', 'calendar'] as const)('opens a direct link to %s and preserves browser navigation', (page) => {
    window.history.replaceState({}, '', `/${page}`);
    const { result } = renderHook(usePageNavigation);
    expect(result.current.currentPage).toBe(page);
    act(() => result.current.handlePageChange('routines'));
    expect(window.location.pathname).toBe('/routines');
    act(() => {
      window.history.replaceState({}, '', `/${page}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current.currentPage).toBe(page);
  });

  it('replaces an unknown path with the home route', () => {
    window.history.replaceState({}, '', '/unknown');
    const { result } = renderHook(usePageNavigation);
    expect(window.location.pathname).toBe('/');
    expect(result.current.currentPage).toBe('dashboard');
  });
});
