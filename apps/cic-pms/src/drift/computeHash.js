/**
 * pms/src/drift/computeHash.js
 * 2026-05-18 v1.0.0
 */
import { createHash } from 'node:crypto';

export function computeHash(pack) {
  const data = JSON.stringify(pack);
  return createHash('sha256').update(data).digest('hex');
}