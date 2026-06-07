/**
 * apps/control-plane/src/runtime/config.mjs
 * @version 1.0.0
 *
 * Runtime configuration — environment variables, defaults.
 * Single source of truth for control-plane configuration.
 */

export const runtimeConfig = {
  port: Number(process.env.PORT ?? 8080),
  host: process.env.HOST ?? '0.0.0.0',
  regions: (process.env.REGIONS ?? 'us-east-1,eu-central-1').split(',').filter(Boolean),
  authDisabled: process.env.AUTH_DISABLED === 'true',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  apiVersion: 'v1',
};

export function validateConfig() {
  if (runtimeConfig.regions.length === 0) {
    throw new Error('At least one region must be configured (REGIONS env var)');
  }
}
