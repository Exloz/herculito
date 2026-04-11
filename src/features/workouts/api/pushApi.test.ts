import { describe, expect, it } from 'vitest';
import { parseBooleanEnvFlag, shouldUseBackgroundRestPushForPlatform } from './pushApi';

describe('pushApi background push gating', () => {
  it('keeps iOS path enabled regardless of Android flag', () => {
    const result = shouldUseBackgroundRestPushForPlatform({
      iosPushCapable: true,
      androidPushCapable: false,
      standalonePwa: true,
      androidBackgroundPushEnabled: false
    });

    expect(result).toBe(true);
  });

  it('enables Android path only when flag is on', () => {
    const enabledResult = shouldUseBackgroundRestPushForPlatform({
      iosPushCapable: false,
      androidPushCapable: true,
      standalonePwa: true,
      androidBackgroundPushEnabled: true
    });

    const disabledResult = shouldUseBackgroundRestPushForPlatform({
      iosPushCapable: false,
      androidPushCapable: true,
      standalonePwa: true,
      androidBackgroundPushEnabled: false
    });

    expect(enabledResult).toBe(true);
    expect(disabledResult).toBe(false);
  });

  it('requires standalone mode for any background push scheduling', () => {
    const result = shouldUseBackgroundRestPushForPlatform({
      iosPushCapable: true,
      androidPushCapable: true,
      standalonePwa: false,
      androidBackgroundPushEnabled: true
    });

    expect(result).toBe(false);
  });
});

describe('parseBooleanEnvFlag', () => {
  it('accepts common truthy string values', () => {
    expect(parseBooleanEnvFlag('true')).toBe(true);
    expect(parseBooleanEnvFlag('TRUE')).toBe(true);
    expect(parseBooleanEnvFlag('1')).toBe(true);
    expect(parseBooleanEnvFlag('yes')).toBe(true);
    expect(parseBooleanEnvFlag('on')).toBe(true);
  });

  it('rejects non-truthy values', () => {
    expect(parseBooleanEnvFlag('false')).toBe(false);
    expect(parseBooleanEnvFlag('0')).toBe(false);
    expect(parseBooleanEnvFlag('')).toBe(false);
    expect(parseBooleanEnvFlag(undefined)).toBe(false);
  });
});
