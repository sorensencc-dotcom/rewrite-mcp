/**
 * pms/src/guards/guard_emptySections.js
 * 2026-05-18 v1.0.0
 */
import { ValidationError } from '../errors.js';

export function guard_emptySections(pack) {
  if (!pack.sections.system || pack.sections.system.trim() === '') {
    throw new ValidationError('System section is empty');
  }
  if (!pack.sections.instructions || pack.sections.instructions.trim() === '') {
    throw new ValidationError('Instructions section is empty');
  }
}