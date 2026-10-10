import { afterEach, describe, expect, it, vi } from 'vitest';
import { isLocalPreview } from './previewMode';

afterEach(() => vi.unstubAllEnvs());

describe('preview mode guard', () => {
  it('requires both development and explicit preview mode', () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('MODE', 'preview');
    expect(isLocalPreview()).toBe(true);
    vi.stubEnv('MODE', 'development');
    expect(isLocalPreview()).toBe(false);
  });

  it('never enables preview in production, even when built in preview mode', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('MODE', 'preview');
    expect(isLocalPreview()).toBe(false);
  });
});
