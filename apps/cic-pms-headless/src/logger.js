/**
 * pms-headless/src/logger.js
 * Headless-optimized: Minimal output, machine-readable.
 */
export const logger = {
  log: (level, msg, ctx = {}) => {
    if (process.env.SILENT === 'true') return;
    console.log(JSON.stringify({ t: new Date().toISOString(), l: level, m: msg, ...ctx }));
  }
};