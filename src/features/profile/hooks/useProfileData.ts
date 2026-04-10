import { useCallback, useEffect, useState } from 'react';
import type { UserBodyMeasurement } from '../../../shared/types';
import {
  fetchBodyMeasurements,
  upsertBodyMeasurement,
  deleteBodyMeasurement
} from '../../../shared/api/dataApi';
import { toUserMessage } from '../../../shared/lib/errorMessages';

const PROFILE_MEASUREMENTS_CACHE_KEY = 'profile-measurements-cache';
const CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

type CachedMeasurementsEntry = {
  savedAt: number;
  measurements: UserBodyMeasurement[];
};

const readMeasurementsCache = (userId: string): UserBodyMeasurement[] | null => {
  if (!userId || typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(PROFILE_MEASUREMENTS_CACHE_KEY);
    if (!raw) return null;

    const cache = JSON.parse(raw) as Record<string, CachedMeasurementsEntry>;
    const entry = cache[userId];
    if (!entry) return null;

    if (Date.now() - entry.savedAt > CACHE_MAX_AGE_MS) {
      delete cache[userId];
      window.localStorage.setItem(PROFILE_MEASUREMENTS_CACHE_KEY, JSON.stringify(cache));
      return null;
    }

    return entry.measurements.map((m) => ({
      ...m,
      measuredAt: new Date(m.measuredAt),
      createdAt: new Date(m.createdAt),
      updatedAt: new Date(m.updatedAt)
    }));
  } catch {
    return null;
  }
};

const writeMeasurementsCache = (userId: string, measurements: UserBodyMeasurement[]): void => {
  if (!userId || typeof window === 'undefined') return;

  try {
    const raw = window.localStorage.getItem(PROFILE_MEASUREMENTS_CACHE_KEY);
    const cache = raw ? (JSON.parse(raw) as Record<string, CachedMeasurementsEntry>) : {};
    cache[userId] = {
      savedAt: Date.now(),
      measurements
    };
    window.localStorage.setItem(PROFILE_MEASUREMENTS_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore cache write failures
  }
};

export const useProfileData = (userId: string) => {
  const [measurements, setMeasurements] = useState<UserBodyMeasurement[]>(() => {
    return readMeasurementsCache(userId) ?? [];
  });
  const [loading, setLoading] = useState(() => !readMeasurementsCache(userId));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadMeasurements = useCallback(
    async (preserveData: boolean) => {
      if (!userId) {
        setMeasurements([]);
        setLoading(false);
        setRefreshing(false);
        setError(null);
        return;
      }

      const cached = readMeasurementsCache(userId);

      if (!preserveData) {
        if (cached) {
          setMeasurements(cached);
          setLoading(false);
        } else {
          setLoading(true);
        }
      } else {
        setRefreshing(true);
      }

      setError(null);

      try {
        const data = await fetchBodyMeasurements(100);
        writeMeasurementsCache(userId, data);
        setMeasurements(data);
      } catch (loadError) {
        if (!preserveData && !cached) {
          setMeasurements([]);
        }
        setError(toUserMessage(loadError, 'No se pudieron cargar las mediciones'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    void loadMeasurements(false);
  }, [loadMeasurements]);

  const refresh = useCallback(async () => {
    await loadMeasurements(true);
  }, [loadMeasurements]);

  const saveMeasurement = useCallback(
    async (payload: {
      id?: string;
      measuredAt: number;
      weightKg?: number | null;
      heightCm?: number | null;
      bodyFatPercentage?: number | null;
      waistCm?: number | null;
      hipsCm?: number | null;
      chestCm?: number | null;
      armsCm?: number | null;
      thighsCm?: number | null;
      calvesCm?: number | null;
      notes?: string | null;
    }): Promise<boolean> => {
      setSaving(true);
      setError(null);

      try {
        const result = await upsertBodyMeasurement(payload);
        await refresh();
        return result.ok;
      } catch (saveError) {
        setError(toUserMessage(saveError, 'Error guardando la medición'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [refresh]
  );

  const removeMeasurement = useCallback(
    async (id: string): Promise<boolean> => {
      setSaving(true);
      setError(null);

      try {
        await deleteBodyMeasurement(id);
        await refresh();
        return true;
      } catch (removeError) {
        setError(toUserMessage(removeError, 'Error eliminando la medición'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [refresh]
  );

  return {
    measurements,
    loading,
    refreshing,
    saving,
    error,
    refresh,
    saveMeasurement,
    removeMeasurement
  };
};
