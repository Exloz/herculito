import { describe, expect, it } from 'vitest';
import { runWithConcurrency } from './promisePool';

describe('runWithConcurrency', () => {
  it('preserves result order', async () => {
    const items = [3, 1, 2, 4];
    const results = await runWithConcurrency(items, 2, async (item) => {
      await new Promise((resolve) => setTimeout(resolve, item * 5));
      return item * 2;
    });

    expect(results).toEqual([6, 2, 4, 8]);
  });

  it('respects the configured concurrency cap', async () => {
    const items = [1, 2, 3, 4, 5, 6];
    let active = 0;
    let maxActive = 0;

    await runWithConcurrency(items, 3, async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
      return true;
    });

    expect(maxActive).toBeLessThanOrEqual(3);
  });
});
