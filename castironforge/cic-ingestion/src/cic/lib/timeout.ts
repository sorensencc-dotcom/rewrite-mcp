// timeout.ts — Deterministic timeout wrapper for all external calls
// CIC enforces hard timeouts on local GPU + remote API operations

import { CICError } from './error.js';

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage?: string
): Promise<T> {
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
  }, timeoutMs);

  try {
    return await promise;
  } catch (e) {
    if (timedOut) {
      throw new CICError('Timeout', timeoutMessage ?? `Operation timed out after ${timeoutMs}ms`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export function withTimeoutRace<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage?: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new CICError('Timeout', timeoutMessage ?? `Operation timed out after ${timeoutMs}ms`)
          ),
        timeoutMs
      )
    ),
  ]);
}
