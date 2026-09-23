import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  parseBooleanEnvFlag,
  registerSubscriptionInApi,
  shouldUseBackgroundRestPushForPlatform
} from './pushApi';

const transportMocks = vi.hoisted(() => ({
  fetchApiJson: vi.fn(),
  fetchPublicApiJson: vi.fn()
}));

vi.mock('../../../shared/api/transport', () => transportMocks);

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

  it('keeps iOS standalone requirement', () => {
    const result = shouldUseBackgroundRestPushForPlatform({
      iosPushCapable: true,
      androidPushCapable: false,
      standalonePwa: false,
      androidBackgroundPushEnabled: true
    });

    expect(result).toBe(false);
  });

  it('does not require standalone mode on Android', () => {
    const result = shouldUseBackgroundRestPushForPlatform({
      iosPushCapable: false,
      androidPushCapable: true,
      standalonePwa: false,
      androidBackgroundPushEnabled: true
    });

    expect(result).toBe(true);
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

describe('push subscription registration', () => {
  beforeEach(() => {
    transportMocks.fetchApiJson.mockReset();
  });

  it('renews a successful registration before scheduling another timer', async () => {
    transportMocks.fetchApiJson.mockResolvedValue({ ok: true });
    const subscription = {
      toJSON: () => ({ endpoint: 'https://push.example/subscription-1' })
    } as PushSubscription;

    await registerSubscriptionInApi('device-cache', subscription);
    await registerSubscriptionInApi('device-cache', subscription);

    expect(transportMocks.fetchApiJson).toHaveBeenCalledTimes(2);
  });

  it('retries a registration that previously failed', async () => {
    transportMocks.fetchApiJson
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ ok: true });
    const subscription = {
      toJSON: () => ({ endpoint: 'https://push.example/subscription-retry' })
    } as PushSubscription;

    await expect(registerSubscriptionInApi('device-retry', subscription)).rejects.toThrow('offline');
    await expect(registerSubscriptionInApi('device-retry', subscription)).resolves.toBeUndefined();

    expect(transportMocks.fetchApiJson).toHaveBeenCalledTimes(2);
  });
});
