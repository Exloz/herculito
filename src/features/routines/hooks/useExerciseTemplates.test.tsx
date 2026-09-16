// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { clearExerciseTemplateCache, useExerciseTemplates } from './useExerciseTemplates';

const mocks = vi.hoisted(() => ({
  fetchExercises: vi.fn(),
  createExerciseTemplate: vi.fn(),
  updateExerciseTemplate: vi.fn(),
  incrementExerciseUsage: vi.fn()
}));

vi.mock('../../../shared/api/dataApi', () => ({
  fetchExercises: mocks.fetchExercises,
  createExerciseTemplate: mocks.createExerciseTemplate,
  updateExerciseTemplate: mocks.updateExerciseTemplate,
  incrementExerciseUsage: mocks.incrementExerciseUsage
}));

const template = {
  id: 'exercise-1',
  name: 'Press de banca',
  category: 'Pecho',
  sets: 3,
  reps: 10,
  restTime: 90,
  createdBy: 'user-1',
  isPublic: true,
  createdAt: 1_700_000_000,
  timesUsed: 2
};

describe('useExerciseTemplates', () => {
  beforeEach(() => {
    clearExerciseTemplateCache();
    vi.clearAllMocks();
    mocks.fetchExercises.mockResolvedValue([template]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reuses a fresh per-user cache across selector remounts', async () => {
    const first = renderHook(() => useExerciseTemplates('user-1'));
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    first.unmount();

    const second = renderHook(() => useExerciseTemplates('user-1'));

    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.exercises[0]?.name).toBe('Press de banca');
    expect(mocks.fetchExercises).toHaveBeenCalledTimes(1);
  });

  it('does not expose one user cache to another user', async () => {
    const first = renderHook(() => useExerciseTemplates('user-1'));
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    first.unmount();

    const second = renderHook(() => useExerciseTemplates('user-2'));

    expect(second.result.current.loading).toBe(true);
    expect(second.result.current.exercises).toEqual([]);
    await waitFor(() => expect(second.result.current.loading).toBe(false));
    expect(mocks.fetchExercises).toHaveBeenCalledTimes(2);
  });

  it('keeps stale cached templates visible while revalidating', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const first = renderHook(() => useExerciseTemplates('user-1'));
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    first.unmount();

    now.mockReturnValue(62_000);
    mocks.fetchExercises.mockReturnValueOnce(new Promise(() => {}));
    const second = renderHook(() => useExerciseTemplates('user-1'));

    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.exercises[0]?.name).toBe('Press de banca');
    expect(mocks.fetchExercises).toHaveBeenCalledTimes(2);
  });

  it('updates cached usage immediately without waiting for the request', async () => {
    mocks.incrementExerciseUsage.mockReturnValue(new Promise(() => {}));
    const first = renderHook(() => useExerciseTemplates('user-1'));
    await waitFor(() => expect(first.result.current.loading).toBe(false));

    act(() => first.result.current.incrementUsage('exercise-1'));
    first.unmount();
    const second = renderHook(() => useExerciseTemplates('user-1'));

    expect(second.result.current.exercises[0]?.timesUsed).toBe(3);
    expect(mocks.incrementExerciseUsage).toHaveBeenCalledWith('exercise-1');
  });
});
