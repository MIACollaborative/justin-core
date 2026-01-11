import sinon from 'sinon';
// eslint-disable-next-line no-duplicate-imports
import type { SinonFakeTimers } from 'sinon';

/**
 * Runs a function with Sinon fake timers installed, restoring automatically.
 *
 * @example
 * ```ts
 * await withFakeTimers(async (clock) => {
 *   // ... schedule timers ...
 *   clock.tick(1000);
 * });
 * ```
 */
export async function withFakeTimers<T>(
  fn: (clock: SinonFakeTimers) => T | Promise<T>,
): Promise<T> {
  const clock = sinon.useFakeTimers();

  try {
    return await fn(clock);
  } finally {
    clock.restore();
  }
}

/**
 * Advance the fake clock by the provided milliseconds.
 * Convenience wrapper for `clock.tick(ms)`.
 */
export function advance(clock: SinonFakeTimers, ms: number): void {
  clock.tick(ms);
}

/**
 * Flush microtasks / promise queue.
 *
 * Notes:
 * - This doesn't "flush timers"; it just yields the microtask queue.
 * - Useful after `await` chains or promise-based callbacks.
 */
export async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
}
