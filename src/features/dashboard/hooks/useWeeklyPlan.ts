import { useCallback, useEffect, useMemo, useState } from 'react';
import { isLocalPreview } from '../../../app/preview/previewMode';
import { getPlanDay, parseWeeklyPlan, setDayAssignment } from '../lib/weeklyPlan';
import type { WeekDay, WeeklyPlan } from '../lib/weeklyPlan';

function readPlan(key: string): WeeklyPlan {
  try {
    return parseWeeklyPlan(window.localStorage.getItem(key));
  } catch {
    return {};
  }
}

export function useWeeklyPlan(userId: string) {
  const key = `herculito-weekly-plan:${isLocalPreview() ? 'preview:' : ''}${userId}`;
  const initialPlan = useMemo(() => readPlan(key), [key]);
  const [stored, setStored] = useState(() => ({ key, plan: initialPlan }));
  const plan = stored.key === key ? stored.plan : initialPlan;
  const [today, setToday] = useState(() => getPlanDay(new Date()));

  useEffect(() => {
    const refreshDay = () => setToday(getPlanDay(new Date()));
    const syncPlan = (event: StorageEvent) => {
      if (event.key === key || event.key === null) {
        setStored({ key, plan: readPlan(key) });
      }
    };
    const interval = window.setInterval(refreshDay, 60000);
    refreshDay();
    window.addEventListener('storage', syncPlan);
    document.addEventListener('visibilitychange', refreshDay);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', syncPlan);
      document.removeEventListener('visibilitychange', refreshDay);
    };
  }, [key]);

  const assignDay = useCallback((day: WeekDay, routineId: string | null | undefined): boolean => {
    const next = setDayAssignment(plan, day, routineId);
    setStored({ key, plan: next });
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
      return true;
    } catch {
      return false;
    }
  }, [key, plan]);

  return { plan, today, assignDay };
}
