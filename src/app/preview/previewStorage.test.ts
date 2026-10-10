import { beforeEach, describe, expect, it } from 'vitest';
import { resetPreviewStorage } from './previewStorage';

const values = new Map<string, string>();
const localStorage: Storage = {
  get length() { return values.size; },
  clear: () => values.clear(),
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => { values.set(key, value); },
  removeItem: (key) => { values.delete(key); },
  key: (index) => [...values.keys()][index] ?? null
};

describe('preview storage reset', () => {
  beforeEach(() => localStorage.clear());

  it('only removes activity and cache entries belonging to the preview user', () => {
    localStorage.setItem('activity-sync:v1:preview-user', 'example');
    localStorage.setItem('activity-sync:v1:preview-user:writer:one', 'example');
    localStorage.setItem('activity-sync:v1:real-user', 'keep');
    localStorage.setItem('activity-sync:v1:preview-user-other', 'keep');
    localStorage.setItem('dashboard-data-cache', JSON.stringify({ 'preview-user': {}, 'real-user': { data: 'keep' } }));
    localStorage.setItem('workoutTimerState', 'real timer');
    localStorage.setItem('preview-workoutTimerState', 'example timer');
    resetPreviewStorage(localStorage);
    expect(localStorage.getItem('activity-sync:v1:preview-user')).toBeNull();
    expect(localStorage.getItem('activity-sync:v1:preview-user:writer:one')).toBeNull();
    expect(localStorage.getItem('activity-sync:v1:real-user')).toBe('keep');
    expect(localStorage.getItem('activity-sync:v1:preview-user-other')).toBe('keep');
    expect(JSON.parse(localStorage.getItem('dashboard-data-cache')!)).toEqual({ 'real-user': { data: 'keep' } });
    expect(localStorage.getItem('workoutTimerState')).toBe('real timer');
    expect(localStorage.getItem('preview-workoutTimerState')).toBeNull();
  });
});
