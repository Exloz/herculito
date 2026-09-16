// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProfileData } from './useProfileData';

const mocks = vi.hoisted(() => ({
  fetchBodyMeasurements: vi.fn(),
  upsertBodyMeasurement: vi.fn(),
  deleteBodyMeasurement: vi.fn()
}));

vi.mock('../api/profileRemote', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/profileRemote')>();
  return {
    ...original,
    fetchBodyMeasurements: mocks.fetchBodyMeasurements,
    upsertBodyMeasurement: mocks.upsertBodyMeasurement,
    deleteBodyMeasurement: mocks.deleteBodyMeasurement
  };
});

const cachedMeasurement = {
  id: 'measurement-1',
  uid: 'user-1',
  measuredAt: '2026-09-15T00:00:00.000Z',
  weightKg: 75,
  notes: 'Before',
  createdAt: '2026-09-15T01:00:00.000Z',
  updatedAt: '2026-09-15T01:00:00.000Z'
};

describe('useProfileData', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value))
    });
    Object.defineProperty(window, 'localStorage', { configurable: true, value: localStorage });
    vi.clearAllMocks();
    mocks.fetchBodyMeasurements.mockReturnValue(new Promise(() => {}));
  });

  const seedCache = (savedAt = Date.now()) => {
    localStorage.setItem('profile-measurements-cache', JSON.stringify({
      'user-1': { savedAt, measurements: [cachedMeasurement] }
    }));
    vi.mocked(localStorage.getItem).mockClear();
  };

  it('decodes stale cached data once and keeps it visible while revalidating', () => {
    seedCache(1);

    const { result } = renderHook(() => useProfileData('user-1'));

    expect(localStorage.getItem).toHaveBeenCalledTimes(1);
    expect(result.current.measurements[0]).toMatchObject({ id: 'measurement-1', weightKg: 75 });
    expect(result.current.loading).toBe(false);
    expect(result.current.refreshing).toBe(true);
  });

  it('applies a successful save locally without a follow-up GET', async () => {
    seedCache();
    mocks.upsertBodyMeasurement.mockResolvedValue({ ok: true, id: 'measurement-1', updated: true });
    const { result } = renderHook(() => useProfileData('user-1'));

    await act(async () => {
      expect(await result.current.saveMeasurement({ id: 'measurement-1', weightKg: 76 })).toBe(true);
    });

    expect(mocks.fetchBodyMeasurements).toHaveBeenCalledTimes(1);
    expect(result.current.measurements[0]).toMatchObject({
      id: 'measurement-1',
      weightKg: 76,
      notes: 'Before'
    });
    const cache = JSON.parse(localStorage.getItem('profile-measurements-cache') ?? '{}');
    expect(cache['user-1'].measurements[0].weightKg).toBe(76);
  });

  it('does not let an older revalidation overwrite a successful save', async () => {
    seedCache();
    let resolveFetch: ((value: never[]) => void) | undefined;
    mocks.fetchBodyMeasurements.mockReturnValue(new Promise<never[]>((resolve) => {
      resolveFetch = resolve;
    }));
    mocks.upsertBodyMeasurement.mockResolvedValue({ ok: true, id: 'measurement-1', updated: true });
    const { result } = renderHook(() => useProfileData('user-1'));

    await act(async () => {
      await result.current.saveMeasurement({ id: 'measurement-1', weightKg: 76 });
    });
    await act(async () => {
      resolveFetch?.([]);
      await Promise.resolve();
    });

    expect(result.current.measurements[0].weightKg).toBe(76);
    expect(result.current.refreshing).toBe(false);
  });

  it('applies a successful delete locally without a follow-up GET', async () => {
    seedCache();
    mocks.deleteBodyMeasurement.mockResolvedValue(undefined);
    const { result } = renderHook(() => useProfileData('user-1'));

    await act(async () => {
      expect(await result.current.removeMeasurement('measurement-1')).toBe(true);
    });

    expect(mocks.fetchBodyMeasurements).toHaveBeenCalledTimes(1);
    expect(result.current.measurements).toEqual([]);
    const cache = JSON.parse(localStorage.getItem('profile-measurements-cache') ?? '{}');
    expect(cache['user-1'].measurements).toEqual([]);
  });
});
