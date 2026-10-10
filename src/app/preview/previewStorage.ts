import { PREVIEW_USER } from './previewFixtures';

export const resetPreviewStorage = (storage: Storage): void => {
  storage.removeItem('preview-workoutTimerState');
  storage.removeItem('preview-remote-timer-command:v1');
  const activityPrefix = `activity-sync:v1:${encodeURIComponent(PREVIEW_USER.id)}`;
  const activityKeys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => key !== null && (key === activityPrefix || key.startsWith(`${activityPrefix}:`)));
  activityKeys.forEach((key) => storage.removeItem(key));
  for (const key of ['dashboard-data-cache', 'sports-data-cache']) {
    try {
      const cached: unknown = JSON.parse(storage.getItem(key) ?? '{}');
      if (cached && typeof cached === 'object' && !Array.isArray(cached)) {
        const entries = cached as Record<string, unknown>;
        delete entries[PREVIEW_USER.id];
        storage.setItem(key, JSON.stringify(entries));
      }
    } catch {
      continue;
    }
  }
};
