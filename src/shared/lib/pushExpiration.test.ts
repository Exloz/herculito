import { describe, expect, it } from 'vitest';
import { isPushExpired } from './pushExpiration';

describe('push expiration', () => {
  it('skips notifications whose delivery window has expired', () => {
    expect(isPushExpired(9_999, 10_000)).toBe(true);
    expect(isPushExpired(10_000, 10_000)).toBe(true);
    expect(isPushExpired(10_001, 10_000)).toBe(false);
    expect(isPushExpired(undefined, 10_000)).toBe(false);
  });
});
