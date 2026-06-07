/**
 * packages/shared/src/logging/index.mjs
 * @version 1.0.0
 *
 * Structured logging utilities.
 */

export const logger = {
  info: (msg, context = {}) => {
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      level: 'info',
      msg,
      ...context,
    }));
  },
  error: (msg, context = {}) => {
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      level: 'error',
      msg,
      ...context,
    }));
  },
  debug: (msg, context = {}) => {
    if (process.env.DEBUG) {
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        level: 'debug',
        msg,
        ...context,
      }));
    }
  },
};
