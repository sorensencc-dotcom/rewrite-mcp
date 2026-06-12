/**
 * Validators for lead scoring inputs and outputs
 */

import type { ScoringInput, LeadScoreResult } from '../schemas/lead-score.types.js';
import type { IRPacket } from '../schemas/ir.types.js';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateScoringInput(input: unknown): input is ScoringInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('ScoringInput must be an object');
  }

  const i = input as Record<string, unknown>;

  // Check complexity
  if (!i.complexity || typeof i.complexity !== 'object') {
    throw new ValidationError('ScoringInput.complexity is required');
  }
  const complexity = i.complexity as Record<string, unknown>;
  if (typeof complexity.score !== 'number') {
    throw new ValidationError('complexity.score must be a number');
  }

  // Check audit
  if (!i.audit || typeof i.audit !== 'object') {
    throw new ValidationError('ScoringInput.audit is required');
  }
  const audit = i.audit as Record<string, unknown>;
  if (!Array.isArray(audit.issues)) {
    throw new ValidationError('audit.issues must be an array');
  }
  if (typeof audit.total !== 'number') {
    throw new ValidationError('audit.total must be a number');
  }

  // Check accessibility
  if (!i.accessibility || typeof i.accessibility !== 'object') {
    throw new ValidationError('ScoringInput.accessibility is required');
  }
  const accessibility = i.accessibility as Record<string, unknown>;
  if (typeof accessibility.score !== 'number') {
    throw new ValidationError('accessibility.score must be a number');
  }

  return true;
}

export function validateLeadScoreResult(result: unknown): result is LeadScoreResult {
  if (!result || typeof result !== 'object') {
    throw new ValidationError('LeadScoreResult must be an object');
  }

  const r = result as Record<string, unknown>;

  if (typeof r.score !== 'number' || r.score < 0 || r.score > 100) {
    throw new ValidationError('score must be a number between 0 and 100');
  }

  if (!['A', 'B', 'C', 'D'].includes(r.tier as string)) {
    throw new ValidationError('tier must be A, B, C, or D');
  }

  if (typeof r.summary !== 'string') {
    throw new ValidationError('summary must be a string');
  }

  if (!Array.isArray(r.insights) || !r.insights.every(i => typeof i === 'string')) {
    throw new ValidationError('insights must be an array of strings');
  }

  if (!Array.isArray(r.recommendations) || !r.recommendations.every(r => typeof r === 'string')) {
    throw new ValidationError('recommendations must be an array of strings');
  }

  if (typeof r.salesReady !== 'boolean') {
    throw new ValidationError('salesReady must be a boolean');
  }

  return true;
}

export function validateIRPacket(packet: unknown): packet is IRPacket {
  if (!packet || typeof packet !== 'object') {
    throw new ValidationError('IRPacket must be an object');
  }

  const p = packet as Record<string, unknown>;

  if (typeof p.version !== 'string') {
    throw new ValidationError('version must be a string');
  }

  if (!p.meta || typeof p.meta !== 'object') {
    throw new ValidationError('meta is required');
  }
  const meta = p.meta as Record<string, unknown>;
  if (typeof meta.url !== 'string') {
    throw new ValidationError('meta.url must be a string');
  }

  if (!Array.isArray(p.routes)) {
    throw new ValidationError('routes must be an array');
  }

  if (!Array.isArray(p.components)) {
    throw new ValidationError('components must be an array');
  }

  if (!p.assets || typeof p.assets !== 'object') {
    throw new ValidationError('assets is required');
  }

  return true;
}

export function assertValid<T>(
  validator: (input: unknown) => input is T,
  input: unknown,
  context: string
): asserts input is T {
  try {
    if (!validator(input)) {
      throw new ValidationError(`Invalid ${context}`);
    }
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError(`${context} validation failed: ${String(error)}`);
  }
}
