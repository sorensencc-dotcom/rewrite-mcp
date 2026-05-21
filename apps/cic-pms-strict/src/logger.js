/**
 * pms-strict/src/logger.js
 */
export const logger = {
  info: (msg, ctx = {}) => console.log(JSON.stringify({ t: new Date().toISOString(), l: 'info', m: msg, ...ctx })),
  error: (msg, ctx = {}) => console.error(JSON.stringify({ t: new Date().toISOString(), l: 'error', m: msg, ...ctx }))
};