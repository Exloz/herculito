export const isPushExpired = (expiresAtMs: unknown, nowMs: number): boolean => (
  typeof expiresAtMs === 'number'
  && Number.isFinite(expiresAtMs)
  && expiresAtMs <= nowMs
);
