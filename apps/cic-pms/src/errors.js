/**
 * pms/src/errors.js
 * 2026-05-18 v1.0.0
 */
export class PMSError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.context = context;
  }
}

export class ValidationError extends PMSError {}
export class LoaderError extends PMSError {}
export class AssemblerError extends PMSError {}
export class DriftError extends PMSError {}