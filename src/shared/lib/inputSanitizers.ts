export const normalizeSingleLine = (value: string, maxLength: number): string => {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

export const normalizeMultiline = (value: string, maxLength: number): string => {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength);
};

export const clampInteger = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};
