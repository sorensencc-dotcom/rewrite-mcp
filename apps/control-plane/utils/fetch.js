/**
 * utils/fetch.js
 * Robust fetch wrapper with retries and backoff.
 */

'use strict';

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

/**
 * fetchWithRetry
 * @param {string} url 
 * @param {object} opts node-fetch options
 * @param {object} retryOpts 
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, opts = {}, retryOpts = {}) {
  const { 
    maxRetries = 3, 
    initialDelay = 100, 
    backoffFactor = 2,
    retryOn = [429, 502, 503, 504],
    correlationId = null
  } = retryOpts;

  let attempt = 0;
  
  while (true) {
    try {
      const res = await fetch(url, opts);
      
      if (res.ok) return res;
      
      // Check if we should retry
      if (retryOn.includes(res.status) && attempt < maxRetries) {
        attempt++;
        const delay = initialDelay * Math.pow(backoffFactor, attempt - 1);
        
        if (correlationId) {
          process.stdout.write(JSON.stringify({
            ts: new Date().toISOString(),
            level: 'warn',
            msg: 'fetch_retry',
            url,
            status: res.status,
            attempt,
            delay,
            correlation_id: correlationId
          }) + '\n');
        }

        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return res;
    } catch (err) {
      if (attempt < maxRetries) {
        attempt++;
        const delay = initialDelay * Math.pow(backoffFactor, attempt - 1);

        if (correlationId) {
          process.stdout.write(JSON.stringify({
            ts: new Date().toISOString(),
            level: 'warn',
            msg: 'fetch_retry_error',
            url,
            error: err.message,
            attempt,
            delay,
            correlation_id: correlationId
          }) + '\n');
        }

        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
}

module.exports = { fetchWithRetry };
