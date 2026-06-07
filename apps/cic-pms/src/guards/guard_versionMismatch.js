/**
 * pms/src/guards/guard_versionMismatch.js
 * 2026-05-18 v1.0.0
 */
import semver from 'semver';
import { ValidationError } from '../errors.js';

export function guard_versionMismatch(pack, expectedRange) {
  if (!semver.satisfies(pack.version, expectedRange)) {
    throw new ValidationError(`Version mismatch: ${pack.version} does not satisfy ${expectedRange}`);
  }
}