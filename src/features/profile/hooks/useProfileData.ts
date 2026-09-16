import { useCallback, useEffect, useRef, useState } from 'react';
import type { UserBodyMeasurement } from '../../../shared/types';
import {
  decodeBodyMeasurements,
  fetchBodyMeasurements,
  upsertBodyMeasurement,
  deleteBodyMeasurement
} from '../api/profileRemote';
import { toUserMessage } from '../../../shared/lib/errorMessages';

const PROFILE_MEASUREMENTS_CACHE_KEY = 'profile-measurements-cache';
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

    return decodeBodyMeasurements(entry.measurements);
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

const applyMeasurementMutation = (
  measurements: UserBodyMeasurement[],
  payload: Parameters<typeof upsertBodyMeasurement>[0],
  measurementId: string,
  userId: string,
  now: Date
): UserBodyMeasurement[] | null => {
  const existing = measurements.find((measurement) => measurement.id === measurementId);
  if (!existing && payload.measuredAt === undefined) return null;

  const measurement: UserBodyMeasurement = existing
    ? {
        ...existing,
        ...payload,
        id: measurementId,
        measuredAt: payload.measuredAt === undefined ? existing.measuredAt : new Date(payload.measuredAt),
        updatedAt: now
      }
    : {
        ...payload,
        id: measurementId,
        uid: userId,
        measuredAt: new Date(payload.measuredAt as number),
        createdAt: now,
        updatedAt: now
      };

  return [
    measurement,
    ...measurements.filter((item) => item.id !== measurementId)
  ].sort((left, right) => right.measuredAt.getTime() - left.measuredAt.getTime());
};

export const useProfileData = (userId: string) => {
  const [initialCache] = useState(() => ({
    userId,
    measurements: readMeasurementsCache(userId)
  }));
  const [measurements, setMeasurements] = useState<UserBodyMeasurement[]>(initialCache.measurements ?? []);
  const measurementsRef = useRef(measurements);
  const generationRef = useRef(0);
  const [loading, setLoading] = useState(!initialCache.measurements);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadMeasurements = useCallback(
    async (preserveData: boolean, cached: UserBodyMeasurement[] | null = null) => {
      const generation = generationRef.current + 1;
      generationRef.current = generation;
      if (!userId) {
        measurementsRef.current = [];
        setMeasurements([]);
        setLoading(false);
        setRefreshing(false);
        setError(null);
        return;
      }

      if (!preserveData) {
        if (cached) {
          measurementsRef.current = cached;
          setMeasurements(cached);
          setLoading(false);
          setRefreshing(true);
        } else {
          setLoading(true);
          setRefreshing(false);
        }
      } else {
        setRefreshing(true);
      }

      setError(null);

      try {
        const data = await fetchBodyMeasurements(100);
        if (generation !== generationRef.current) return;
        writeMeasurementsCache(userId, data);
        measurementsRef.current = data;
        setMeasurements(data);
      } catch (loadError) {
        if (generation !== generationRef.current) return;
        if (!preserveData && !cached) {
          setMeasurements([]);
        }
        setError(toUserMessage(loadError, 'No se pudieron cargar las mediciones'));
      } finally {
        if (generation === generationRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [userId]
  );

  useEffect(() => {
    const cached = initialCache.userId === userId
      ? initialCache.measurements
      : readMeasurementsCache(userId);
    void loadMeasurements(false, cached);
  }, [initialCache, loadMeasurements, userId]);

  const refresh = useCallback(async () => {
    await loadMeasurements(true);
  }, [loadMeasurements]);

  const saveMeasurement = useCallback(
    async (payload: {
      id?: string;
      measuredAt?: number;
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
        if (!result.ok) return false;
        generationRef.current += 1;

        const measurementId = result.id ?? payload.id;
        const nextMeasurements = measurementId
          ? applyMeasurementMutation(
              measurementsRef.current,
              payload,
              measurementId,
              userId,
              new Date()
            )
          : null;

        if (nextMeasurements) {
          measurementsRef.current = nextMeasurements;
          setMeasurements(nextMeasurements);
          writeMeasurementsCache(userId, nextMeasurements);
          setRefreshing(false);
        } else {
          void refresh();
        }
        return result.ok;
      } catch (saveError) {
        setError(toUserMessage(saveError, 'Error guardando la medición'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [refresh, userId]
  );

  const removeMeasurement = useCallback(
    async (id: string): Promise<boolean> => {
      setSaving(true);
      setError(null);

      try {
        await deleteBodyMeasurement(id);
        generationRef.current += 1;
        const nextMeasurements = measurementsRef.current.filter((measurement) => measurement.id !== id);
        measurementsRef.current = nextMeasurements;
        setMeasurements(nextMeasurements);
        writeMeasurementsCache(userId, nextMeasurements);
        setRefreshing(false);
        return true;
      } catch (removeError) {
        setError(toUserMessage(removeError, 'Error eliminando la medición'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [userId]
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
