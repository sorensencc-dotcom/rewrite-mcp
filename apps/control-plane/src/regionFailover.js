/**
 * apps/control-plane/src/regionFailover.js
 * @version 1.0.0
 * @date 2026-05-20
 *
 * Region Failover logic for the CIC Control Plane.
 */

'use strict';

/**
 * Executes a function with region failover logic.
 * 
 * @param {Array} regions - Array of region objects.
 * @param {Function} fn - The function to execute, receives the region object as argument.
 * @returns {Promise<Object>} - The result of the first successful execution.
 */
export async function withRegionFailover(regions, fn) {
  let lastError = null;

  for (const region of regions) {
    // Basic health check simulation or cooldown check could go here
    if (region.cooldownUntil && region.cooldownUntil > Date.now()) {
      continue;
    }

    try {
      return await fn(region);
    } catch (err) {
      lastError = err;
      region.failures = (region.failures || 0) + 1;
      
      console.warn(`[RegionFailover] Region ${region.id} failed (total failures: ${region.failures}): ${err.message}`);
      
      if (region.failures >= 3) {
        console.error(`[RegionFailover] Region ${region.id} hit failure threshold. Entering 60s cooldown.`);
        region.cooldownUntil = Date.now() + 60000;
        region.failures = 0; // Reset for next cycle after cooldown
      }
    }
  }

  throw new Error(`All regions failed or in cooldown. Last error: ${lastError?.message}`);
}
