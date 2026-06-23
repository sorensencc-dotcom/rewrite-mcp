// retry.ts — Deterministic retry policy for remote operations
// Retries: 429, 500, network errors (not validation errors)

import { CICError } from './error.js';

interface RetryOptions {
  retries?: number;
  backoffMs?: number;
  backoffMultiplier?: number;
  maxBackoffMs?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  retries: 2,
  backoffMs: 200,
  backoffMultiplier: 2,
  maxBackoffMs: 5000,
};

export async function retry<T>(
  fn: () => Promise<T>,
  opts?: RetryOptions
): Promise<T> {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  let lastError: Error | null = null;
  let backoff = options.backoffMs;

  for (let attempt = 0; attempt <= options.retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));

      // Don't retry validation or internal errors
      if (
        lastError instanceof CICError &&
        (lastError.category === 'Validation' || lastError.category === 'Internal')
      ) {
        throw lastError;
      }

      if (attempt < options.retries) {
        await new Promise((resolve) => setTimeout(resolve, backoff));
        backoff = Math.min(backoff * options.backoffMultiplier, options.maxBackoffMs);
      }
    }
  }

  throw lastError ?? new CICError('Internal', 'Retry exhausted');
}
