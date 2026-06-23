// warmPoolHooks.ts — WarmPool lifecycle integration
// Signals pool health status based on extraction success/failure

import type { WarmPoolManager } from '../analyzers/warmPool/WarmPoolManager.js';
import { CICError } from './error.js';

export async function signalWarmPoolSuccess(pool: WarmPoolManager | null) {
  if (!pool) return;
  try {
    await pool.markHealthy?.();
  } catch {
    // Silent fail
  }
}

export async function signalWarmPoolDegraded(pool: WarmPoolManager | null, error: Error | string) {
  if (!pool) return;
  try {
    const msg = error instanceof Error ? error.message : String(error);
    await pool.markDegraded?.(msg);
  } catch {
    // Silent fail
  }
}

export async function signalWarmPoolOOM(pool: WarmPoolManager | null) {
  if (!pool) return;
  try {
    await pool.signalOOMRecovery?.();
  } catch {
    // Silent fail
  }
}

export function isOOMError(error: Error | CICError): boolean {
  const msg = error.message.toLowerCase();
  return msg.includes('oom') || msg.includes('out of memory') || msg.includes('memory pressure');
}
