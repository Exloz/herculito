import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchHiddenPublicRoutineIds, updateRoutineVisibility } from '../utils/dataApi';

const VISIBILITY_CHANGE_EVENT = 'dashboard-public-routines-visibility-changed';

const applyVisibilityToHidden = (hiddenIds: string[], routineId: string, isVisible: boolean): string[] => {
  const hiddenIdsSet = new Set(hiddenIds);

  if (isVisible) {
    hiddenIdsSet.delete(routineId);
  } else {
    hiddenIdsSet.add(routineId);
  }

  return Array.from(hiddenIdsSet);
};

export const usePublicRoutineVisibility = (userId: string) => {
  const [hiddenRoutineIds, setHiddenRoutineIds] = useState<string[]>([]);
  const [isRoutineVisibilityLoading, setIsRoutineVisibilityLoading] = useState(false);
  const [updatingRoutineIds, setUpdatingRoutineIds] = useState<string[]>([]);

  const loadVisibility = useCallback(async () => {
    if (!userId) {
      setHiddenRoutineIds([]);
      setIsRoutineVisibilityLoading(false);
      return;
    }

    setIsRoutineVisibilityLoading(true);
    try {
      const hiddenIds = await fetchHiddenPublicRoutineIds();
      setHiddenRoutineIds(hiddenIds);
    } catch {
      setHiddenRoutineIds([]);
    } finally {
      setIsRoutineVisibilityLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadVisibility();
  }, [loadVisibility]);

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;

    const onVisibilityChange = () => {
      void loadVisibility();
    };

    window.addEventListener(VISIBILITY_CHANGE_EVENT, onVisibilityChange);
    return () => {
      window.removeEventListener(VISIBILITY_CHANGE_EVENT, onVisibilityChange);
    };
  }, [loadVisibility, userId]);

  const hiddenRoutineSet = useMemo(() => new Set(hiddenRoutineIds), [hiddenRoutineIds]);
  const updatingRoutineSet = useMemo(() => new Set(updatingRoutineIds), [updatingRoutineIds]);

  const isRoutineVisibleOnDashboard = useCallback((routineId: string): boolean => {
    return !hiddenRoutineSet.has(routineId);
  }, [hiddenRoutineSet]);

  const isRoutineVisibilityUpdating = useCallback((routineId: string): boolean => {
    return updatingRoutineSet.has(routineId);
  }, [updatingRoutineSet]);

  const setRoutineVisibilityOnDashboard = useCallback(async (routineId: string, isVisible: boolean) => {
    if (!userId) return;
    if (updatingRoutineSet.has(routineId)) return;

    setUpdatingRoutineIds((previousIds) => [...previousIds, routineId]);
    setHiddenRoutineIds((previousHiddenIds) => applyVisibilityToHidden(previousHiddenIds, routineId, isVisible));

    try {
      await updateRoutineVisibility(routineId, isVisible);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(VISIBILITY_CHANGE_EVENT));
      }
    } catch (error) {
      setHiddenRoutineIds((previousHiddenIds) => applyVisibilityToHidden(previousHiddenIds, routineId, !isVisible));
      throw error;
    } finally {
      setUpdatingRoutineIds((previousIds) => previousIds.filter((id) => id !== routineId));
    }
  }, [updatingRoutineSet, userId]);

  return {
    hiddenRoutineIds: hiddenRoutineSet,
    isRoutineVisibilityLoading,
    isRoutineVisibleOnDashboard,
    isRoutineVisibilityUpdating,
    setRoutineVisibilityOnDashboard
  };
};
