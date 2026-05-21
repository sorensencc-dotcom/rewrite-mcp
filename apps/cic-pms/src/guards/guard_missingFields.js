/**
 * pms/src/guards/guard_missingFields.js
 * 2026-05-18 v1.0.0
 */
import { ValidationError } from '../errors.js';

export function guard_missingFields(pack) {
  const required = ['name', 'version', 'model', 'sections'];
  for (const field of required) {
    if (!pack[field]) {
      throw new ValidationError(`Missing required field: ${field}`);
    }
  }
}