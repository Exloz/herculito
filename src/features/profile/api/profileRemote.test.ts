import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as transport from '../../../shared/api/transport';
import { decodeBodyMeasurement, fetchBodyMeasurements, upsertBodyMeasurement } from './profileRemote';

vi.mock('../../../shared/api/transport', () => ({
  fetchApiJson: vi.fn()
}));

const rawMeasurement = {
  id: 'measurement-1',
  uid: 'user-1',
  measuredAtMs: 1_789_430_400_000,
  weightKg: 75.5,
  heightCm: null,
  bodyFatPercentage: null,
  waistCm: 82,
  hipsCm: null,
  chestCm: null,
  armsCm: null,
  thighsCm: null,
  calvesCm: null,
  notes: 'Morning',
  createdAtMs: 1_789_430_500_000,
  updatedAtMs: 1_789_430_600_000
};

describe('profile remote adapter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('decodes raw body measurement timestamps', async () => {
    vi.mocked(transport.fetchApiJson).mockResolvedValue({ measurements: [rawMeasurement] });

    const result = await fetchBodyMeasurements(20);

    expect(result[0]).toEqual(expect.objectContaining({
      measuredAt: new Date(1_789_430_400_000),
      createdAt: new Date(1_789_430_500_000),
      updatedAt: new Date(1_789_430_600_000),
      heightCm: null
    }));
  });

  it('preserves omitted update fields in the request body', async () => {
    vi.mocked(transport.fetchApiJson).mockResolvedValue({ ok: true, id: 'measurement-1', updated: true });

    await upsertBodyMeasurement({ id: 'measurement-1', weightKg: 76 });

    expect(transport.fetchApiJson).toHaveBeenCalledWith(
      '/v1/data/profile/measurements',
      expect.objectContaining({ body: JSON.stringify({ id: 'measurement-1', weightKg: 76 }) })
    );
  });

  it('rejects malformed measurement timestamps', () => {
    expect(() => decodeBodyMeasurement({ ...rawMeasurement, measuredAtMs: 'someday' }, 'measurement')).toThrow(
      'measurement.measuredAtMs'
    );
  });
});
