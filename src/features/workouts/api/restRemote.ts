import { fetchApiJson } from '../../../shared/api/transport';
import { expectBoolean, expectNumber, expectRecord, expectString } from '../../../shared/api/wire';

export interface ScheduleRemoteRestTimerInput {
  deviceId: string;
  executeAtMs: number;
  commandAtMs: number;
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
}

export interface ScheduleRemoteRestTimerResult {
  accepted: boolean;
  jobId: string;
  executeAtMs: number;
  requestedAtMs: number;
}

export interface CancelRemoteRestTimerResult {
  accepted: boolean;
  canceled: boolean;
  jobId: string;
  requestedAtMs: number;
}

export const scheduleRemoteRestTimer = async (
  input: ScheduleRemoteRestTimerInput
): Promise<ScheduleRemoteRestTimerResult> => {
  const value = await fetchApiJson<unknown>('/v1/rest/schedule', {
    method: 'POST',
    body: JSON.stringify(input)
  });
  const result = expectRecord(value, 'rest schedule response');
  return {
    accepted: expectBoolean(result.accepted, 'rest schedule response.accepted'),
    jobId: expectString(result.jobId, 'rest schedule response.jobId'),
    executeAtMs: expectNumber(result.executeAtMs, 'rest schedule response.executeAtMs'),
    requestedAtMs: expectNumber(result.requestedAtMs, 'rest schedule response.requestedAtMs')
  };
};

export const cancelRemoteRestTimer = async (input: {
  deviceId: string;
  commandAtMs: number;
}): Promise<CancelRemoteRestTimerResult> => {
  const value = await fetchApiJson<unknown>('/v1/rest/cancel', {
    method: 'POST',
    body: JSON.stringify(input)
  });
  const result = expectRecord(value, 'rest cancel response');
  return {
    accepted: expectBoolean(result.accepted, 'rest cancel response.accepted'),
    canceled: expectBoolean(result.canceled, 'rest cancel response.canceled'),
    jobId: expectString(result.jobId, 'rest cancel response.jobId'),
    requestedAtMs: expectNumber(result.requestedAtMs, 'rest cancel response.requestedAtMs')
  };
};
