import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as transport from '../../../shared/api/transport';
import { cancelRemoteRestTimer, scheduleRemoteRestTimer } from './restRemote';

vi.mock('../../../shared/api/transport', () => ({
  fetchApiJson: vi.fn()
}));

describe('rest remote adapter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('sends an absolute scheduling command and decodes the accepted outcome', async () => {
    vi.mocked(transport.fetchApiJson).mockResolvedValue({
      ok: true,
      accepted: true,
      jobId: 'user-1:device-1:rest',
      executeAtMs: 1_789_467_690_000,
      requestedAtMs: 1_789_467_600_000
    });

    const result = await scheduleRemoteRestTimer({
      deviceId: 'device-1',
      executeAtMs: 1_789_467_690_000,
      commandAtMs: 1_789_467_600_000,
      tag: 'rest-timer:1789467600000'
    });

    expect(transport.fetchApiJson).toHaveBeenCalledWith('/v1/rest/schedule', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: 'device-1',
        executeAtMs: 1_789_467_690_000,
        commandAtMs: 1_789_467_600_000,
        tag: 'rest-timer:1789467600000'
      })
    });
    expect(result).toEqual({
      accepted: true,
      jobId: 'user-1:device-1:rest',
      executeAtMs: 1_789_467_690_000,
      requestedAtMs: 1_789_467_600_000
    });
  });

  it('sends cancellation ordering data and decodes a rejected outcome', async () => {
    vi.mocked(transport.fetchApiJson).mockResolvedValue({
      ok: true,
      accepted: false,
      canceled: false,
      jobId: 'user-1:device-1:rest',
      requestedAtMs: 1_789_467_600_001
    });

    const result = await cancelRemoteRestTimer({ deviceId: 'device-1', commandAtMs: 1_789_467_600_001 });

    expect(transport.fetchApiJson).toHaveBeenCalledWith('/v1/rest/cancel', {
      method: 'POST',
      body: JSON.stringify({ deviceId: 'device-1', commandAtMs: 1_789_467_600_001 })
    });
    expect(result).toEqual({
      accepted: false,
      canceled: false,
      jobId: 'user-1:device-1:rest',
      requestedAtMs: 1_789_467_600_001
    });
  });

  it('rejects malformed scheduling outcomes at the wire seam', async () => {
    vi.mocked(transport.fetchApiJson).mockResolvedValue({ ok: true, accepted: 'yes' });

    await expect(scheduleRemoteRestTimer({
      deviceId: 'device-1',
      executeAtMs: 1_789_467_690_000,
      commandAtMs: 1_789_467_600_000
    })).rejects.toThrow('Invalid rest schedule response.accepted');
  });
});
