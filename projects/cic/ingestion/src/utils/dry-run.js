/**
 * Dry-Run Utility - Provides a global check for dry-run mode.
 */

/**
 * Returns true if the DRY_RUN environment variable is set to 'true'.
 * 
 * @returns {boolean}
 */
export function isDryRun() {
  return process.env.DRY_RUN === 'true';
}
