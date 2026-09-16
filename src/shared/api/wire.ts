export class WireDecodeError extends Error {
  constructor(path: string) {
    super(`Invalid ${path}`);
    this.name = 'WireDecodeError';
  }
}

const invalid = (path: string): never => {
  throw new WireDecodeError(path);
};

export const expectRecord = (value: unknown, path: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return invalid(path);
  }
  return value as Record<string, unknown>;
};

export const expectArray = (value: unknown, path: string): unknown[] => {
  if (!Array.isArray(value)) return invalid(path);
  return value;
};

export const expectString = (value: unknown, path: string): string => {
  if (typeof value !== 'string') return invalid(path);
  return value;
};

export const optionalString = (value: unknown, path: string): string | undefined => {
  if (value == null) return undefined;
  return expectString(value, path);
};

export const expectNumber = (value: unknown, path: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return invalid(path);
  return value;
};

export const optionalNumber = (value: unknown, path: string): number | undefined => {
  if (value == null) return undefined;
  return expectNumber(value, path);
};

export const expectBoolean = (value: unknown, path: string): boolean => {
  if (typeof value !== 'boolean') return invalid(path);
  return value;
};

export const expectEnum = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string
): T => {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    return invalid(path);
  }
  return value as T;
};

export const optionalEnum = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string
): T | undefined => {
  if (value == null) return undefined;
  return expectEnum(value, allowed, path);
};

export const expectDate = (value: unknown, path: string): Date => {
  if (value instanceof Date) {
    if (Number.isFinite(value.getTime())) return value;
    return invalid(path);
  }

  const timestamp = typeof value === 'number'
    ? (value < 1e12 ? value * 1000 : value)
    : typeof value === 'string'
      ? Date.parse(value)
      : Number.NaN;
  if (!Number.isFinite(timestamp)) return invalid(path);

  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return invalid(path);
  return date;
};

export const optionalDate = (value: unknown, path: string): Date | undefined => {
  if (value == null) return undefined;
  return expectDate(value, path);
};
