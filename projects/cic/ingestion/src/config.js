/**
 * src/config.js
 * Infisical Secret Plane Guardrails (Harvester)
 */

const REQUIRED_SECRETS = [
  'HARV_GEMINI_API_KEY',
  'HARV_ANTHROPIC_API_KEY',
  'HARV_TELEMETRY_URL',
  'HARV_REGION'
];

export function validateConfig() {
  const missing = REQUIRED_SECRETS.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error("\x1b[31m[FATAL_SECRET_MISCONFIGURATION]\x1b[0m");
    console.error("The following required secrets are missing from the environment:");
    missing.forEach(key => console.error(` - ${key}`));
    console.error("\nEnsure you are running the service via Infisical:");
    console.error("  infisical run -- npm start\n");
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }

  return {
    geminiApiKey: process.env.HARV_GEMINI_API_KEY,
    anthropicApiKey: process.env.HARV_ANTHROPIC_API_KEY,
    telemetryUrl: process.env.HARV_TELEMETRY_URL,
    region: process.env.HARV_REGION,
    llamaUrl: process.env.HARV_LLAMA_URL || 'http://localhost:8080'
  };
}

export const config = validateConfig();
