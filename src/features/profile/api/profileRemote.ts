import type { UserBodyMeasurement } from '../../../shared/types';
import { fetchApiJson } from '../../../shared/api/transport';
import {
  expectArray,
  expectBoolean,
  expectDate,
  expectRecord,
  expectString,
  optionalString
} from '../../../shared/api/wire';

export interface BodyMeasurementMutation {
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
}

const decodeNullableNumber = (value: unknown, path: string): number | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Invalid ${path}`);
  return value;
};

export const decodeBodyMeasurement = (value: unknown, path: string): UserBodyMeasurement => {
  const measurement = expectRecord(value, path);
  const measuredAt = measurement.measuredAtMs ?? measurement.measuredAt;
  const createdAt = measurement.createdAtMs ?? measurement.createdAt;
  const updatedAt = measurement.updatedAtMs ?? measurement.updatedAt;
  const notes = measurement.notes === null
    ? null
    : optionalString(measurement.notes, `${path}.notes`);

  return {
    id: expectString(measurement.id, `${path}.id`),
    uid: expectString(measurement.uid, `${path}.uid`),
    measuredAt: expectDate(measuredAt, `${path}.measuredAtMs`),
    weightKg: decodeNullableNumber(measurement.weightKg, `${path}.weightKg`),
    heightCm: decodeNullableNumber(measurement.heightCm, `${path}.heightCm`),
    bodyFatPercentage: decodeNullableNumber(measurement.bodyFatPercentage, `${path}.bodyFatPercentage`),
    waistCm: decodeNullableNumber(measurement.waistCm, `${path}.waistCm`),
    hipsCm: decodeNullableNumber(measurement.hipsCm, `${path}.hipsCm`),
    chestCm: decodeNullableNumber(measurement.chestCm, `${path}.chestCm`),
    armsCm: decodeNullableNumber(measurement.armsCm, `${path}.armsCm`),
    thighsCm: decodeNullableNumber(measurement.thighsCm, `${path}.thighsCm`),
    calvesCm: decodeNullableNumber(measurement.calvesCm, `${path}.calvesCm`),
    notes,
    createdAt: expectDate(createdAt, `${path}.createdAtMs`),
    updatedAt: expectDate(updatedAt, `${path}.updatedAtMs`)
  };
};

export const decodeBodyMeasurements = (value: unknown): UserBodyMeasurement[] => {
  return expectArray(value, 'body measurements').map((measurement, index) => (
    decodeBodyMeasurement(measurement, `body measurements[${index}]`)
  ));
};

export const fetchBodyMeasurements = async (limit = 50): Promise<UserBodyMeasurement[]> => {
  const response = expectRecord(
    await fetchApiJson(`/v1/data/profile/measurements?limit=${limit}`),
    'body measurements response'
  );
  return decodeBodyMeasurements(response.measurements);
};

export const upsertBodyMeasurement = async (
  payload: BodyMeasurementMutation
): Promise<{ ok: boolean; id?: string; updated?: boolean }> => {
  const response = expectRecord(await fetchApiJson('/v1/data/profile/measurements', {
    method: 'POST',
    body: JSON.stringify(payload)
  }), 'body measurement mutation response');

  return {
    ok: expectBoolean(response.ok, 'body measurement mutation response.ok'),
    id: optionalString(response.id, 'body measurement mutation response.id'),
    updated: response.updated === undefined
      ? undefined
      : expectBoolean(response.updated, 'body measurement mutation response.updated')
  };
};

export const deleteBodyMeasurement = async (id: string): Promise<void> => {
  await fetchApiJson(`/v1/data/profile/measurements/${id}`, { method: 'DELETE' });
};
