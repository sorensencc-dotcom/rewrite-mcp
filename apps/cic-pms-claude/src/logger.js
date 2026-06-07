/**
 * pms-claude/src/logger.js
 * 2026-05-18 v1.0.0
 */
export const logger = {
  info: (message, context = {}) => console.log(JSON.stringify({ level: 'info', message, ...context, timestamp: new Date().toISOString() })),
  error: (message, context = {}) => console.error(JSON.stringify({ level: 'error', message, ...context, timestamp: new Date().toISOString() })),
  warn: (message, context = {}) => console.warn(JSON.stringify({ level: 'warn', message, ...context, timestamp: new Date().toISOString() })),
};