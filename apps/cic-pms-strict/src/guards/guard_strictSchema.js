/**
 * pms-strict/src/guards/guard_strictSchema.js
 */
import { StrictError } from '../errors.js';

export function guard_strictSchema(pack) {
  if (!pack.response_schema || Object.keys(pack.response_schema).length === 0) {
    throw new StrictError('Strict mode requires a non-empty response_schema');
  }
}