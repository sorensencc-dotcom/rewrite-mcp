/**
 * pms-claude/src/drift/detectDrift.js
 * 2026-05-18 v1.0.0
 */
import { computeHash } from './computeHash.js';

export function detectDrift(pack, expectedHash) {
  const currentHash = computeHash(pack);
  const drifted = currentHash !== expectedHash;
  
  return {
    drifted,
    currentHash,
    expectedHash,
    timestamp: new Date().toISOString()
  };
}