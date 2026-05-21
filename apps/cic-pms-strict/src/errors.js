/**
 * pms-strict/src/errors.js
 */
export class StrictError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'StrictError';
    this.context = context;
  }
}