import { describe, expect, it } from 'vitest';
import type { UserBodyMeasurement } from '../../../shared/types';
import { buildMeasurementMutation, type MeasurementFormValues } from './measurementForm';

const values: MeasurementFormValues = {
  measuredAt: '2026-09-15',
  weightKg: '',
  heightCm: '',
  bodyFatPercentage: '',
  waistCm: '',
  hipsCm: '',
  chestCm: '',
  armsCm: '',
  thighsCm: '',
  calvesCm: '',
  notes: ''
};

const original: UserBodyMeasurement = {
  id: 'measurement-1',
  uid: 'user-1',
  measuredAt: new Date('2026-09-15'),
  weightKg: 75,
  heightCm: null,
  notes: 'morning',
  createdAt: new Date('2026-09-15'),
  updatedAt: new Date('2026-09-15')
};

describe('measurement form mutation', () => {
  it('omits untouched empty create values and sends null only when clearing existing values', () => {
    expect(buildMeasurementMutation(values)).toEqual({
      ok: true,
      payload: { measuredAt: new Date('2026-09-15').getTime() }
    });
    expect(buildMeasurementMutation(values, original)).toEqual({
      ok: true,
      payload: {
        id: 'measurement-1',
        measuredAt: new Date('2026-09-15').getTime(),
        weightKg: null,
        notes: null
      }
    });
  });

  it.each([
    ['weightKg', '-1'],
    ['heightCm', '301'],
    ['bodyFatPercentage', '101'],
    ['waistCm', 'not-a-number']
  ] as const)('rejects invalid %s instead of converting it to null', (field, value) => {
    const result = buildMeasurementMutation({ ...values, [field]: value });
    expect(result.ok).toBe(false);
  });
});
