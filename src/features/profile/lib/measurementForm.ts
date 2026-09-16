import type { UserBodyMeasurement } from '../../../shared/types';
import type { BodyMeasurementMutation } from '../api/profileRemote';

export interface MeasurementFormValues {
  measuredAt: string;
  weightKg: string;
  heightCm: string;
  bodyFatPercentage: string;
  waistCm: string;
  hipsCm: string;
  chestCm: string;
  armsCm: string;
  thighsCm: string;
  calvesCm: string;
  notes: string;
}

type NumericField = Exclude<keyof MeasurementFormValues, 'measuredAt' | 'notes'>;

const limits: Record<NumericField, { max: number; label: string }> = {
  weightKg: { max: 500, label: 'peso' },
  heightCm: { max: 300, label: 'altura' },
  bodyFatPercentage: { max: 100, label: 'porcentaje de grasa' },
  waistCm: { max: 500, label: 'cintura' },
  hipsCm: { max: 500, label: 'cadera' },
  chestCm: { max: 500, label: 'pecho' },
  armsCm: { max: 500, label: 'brazos' },
  thighsCm: { max: 500, label: 'muslos' },
  calvesCm: { max: 500, label: 'pantorrillas' }
};

export type MeasurementFormResult =
  | { ok: true; payload: BodyMeasurementMutation }
  | { ok: false; message: string };

export const buildMeasurementMutation = (
  values: MeasurementFormValues,
  original?: UserBodyMeasurement | null
): MeasurementFormResult => {
  const measuredAt = new Date(values.measuredAt).getTime();
  if (!Number.isFinite(measuredAt)) return { ok: false, message: 'Fecha inválida' };

  const payload: BodyMeasurementMutation = {
    ...(original ? { id: original.id } : {}),
    measuredAt
  };

  for (const [field, { max, label }] of Object.entries(limits) as Array<[
    NumericField,
    { max: number; label: string }
  ]>) {
    const raw = values[field].trim();
    if (!raw) {
      if (original && original[field] != null) payload[field] = null;
      continue;
    }

    const parsed = Number(raw.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > max) {
      return { ok: false, message: `El valor de ${label} debe estar entre 0 y ${max}.` };
    }
    payload[field] = parsed;
  }

  const notes = values.notes.trim();
  if (notes) {
    payload.notes = notes;
  } else if (original?.notes) {
    payload.notes = null;
  }

  return { ok: true, payload };
};
