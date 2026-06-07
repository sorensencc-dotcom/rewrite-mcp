/**
 * pms/src/assembler/applyGuards.js
 * 2026-05-18 v1.0.0
 */
import { guard_missingFields } from '../guards/guard_missingFields.js';
import { guard_emptySections } from '../guards/guard_emptySections.js';

export function applyGuards(pack) {
  guard_missingFields(pack);
  guard_emptySections(pack);
}