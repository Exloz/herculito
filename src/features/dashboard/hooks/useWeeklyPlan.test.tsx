import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWeeklyPlan } from './useWeeklyPlan';

vi.mock('../../../app/preview/previewMode', () => ({ isLocalPreview: () => false }));

beforeEach(() => {
  const values = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value))
  };
  vi.stubGlobal('localStorage', storage);
  Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('weekly plan persistence', () => {
  it('advances the planned day at midnight in the app timezone', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-12T04:59:30Z'));
    const { result } = renderHook(() => useWeeklyPlan('one'));
    expect(result.current.today).toBe('sunday');
    act(() => { vi.advanceTimersByTime(60000); });
    expect(result.current.today).toBe('monday');
  });

  it('restores saved plans and isolates users', () => {
    const { result, rerender, unmount } = renderHook(({ userId }) => useWeeklyPlan(userId), { initialProps: { userId: 'one' } });
    act(() => { result.current.assignDay('monday', 'routine-1'); });
    expect(result.current.plan).toEqual({ monday: 'routine-1' });
    rerender({ userId: 'two' });
    expect(result.current.plan).toEqual({});
    act(() => { result.current.assignDay('tuesday', null); });
    rerender({ userId: 'one' });
    expect(result.current.plan).toEqual({ monday: 'routine-1' });
    unmount();
    const restored = renderHook(() => useWeeklyPlan('two'));
    expect(restored.result.current.plan).toEqual({ tuesday: null });
  });

  it('reports blocked storage without losing the current session plan', () => {
    vi.mocked(window.localStorage.setItem).mockImplementation(() => { throw new Error('blocked'); });
    const { result } = renderHook(() => useWeeklyPlan('one'));
    let saved = true;
    act(() => { saved = result.current.assignDay('monday', 'routine-1'); });
    expect(saved).toBe(false);
    expect(result.current.plan.monday).toBe('routine-1');
  });

  it('refreshes when another tab changes or clears the plan', () => {
    const { result } = renderHook(() => useWeeklyPlan('one'));
    const key = 'herculito-weekly-plan:one';
    window.localStorage.setItem(key, '{"monday":null}');
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key })); });
    expect(result.current.plan.monday).toBeNull();
    window.localStorage.setItem(key, '{}');
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: null })); });
    expect(result.current.plan).toEqual({});
  });
});
