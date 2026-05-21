/**
 * pms-headless/src/errors.js
 */
export class HeadlessError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'HeadlessError';
    this.context = context;
  }
}