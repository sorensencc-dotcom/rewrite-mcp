/**
 * pms/src/logger.js
 * 2026-05-18 v1.0.0
 */
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const CURRENT_LOG_LEVEL = LOG_LEVELS[process.env.ORCH_LOG_LEVEL || process.env.LOG_LEVEL || 'info'] ?? LOG_LEVELS.info;

export const logger = {
  debug: (message, context = {}) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.debug) {
      console.log(JSON.stringify({ level: 'debug', message, ...context, timestamp: new Date().toISOString() }));
    }
  },
  info: (message, context = {}) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.info) {
      console.log(JSON.stringify({ level: 'info', message, ...context, timestamp: new Date().toISOString() }));
    }
  },
  error: (message, context = {}) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.error) {
      console.error(JSON.stringify({ level: 'error', message, ...context, timestamp: new Date().toISOString() }));
    }
  },
  warn: (message, context = {}) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.warn) {
      console.warn(JSON.stringify({ level: 'warn', message, ...context, timestamp: new Date().toISOString() }));
    }
  },
};