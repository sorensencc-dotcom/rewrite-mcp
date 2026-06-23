/**
 * Mock Sandbox Root Helper
 * Deterministic test-time sandbox for FileWriteAdapter
 */

import * as os from 'os';
import * as path from 'path';

export function createSandboxRoot(): string {
  // Use temp directory for deterministic, isolated sandbox
  const tmpDir = os.tmpdir();
  const sandbox = path.join(tmpDir, `cic-sandbox-test-${Date.now()}`);
  return sandbox;
}

export function createSandboxRootSync(): string {
  // Synchronous variant for test setup
  return createSandboxRoot();
}
