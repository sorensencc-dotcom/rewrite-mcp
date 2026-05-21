/**
 * src/config.js
 * Infisical Secret Plane Guardrails
 * 
 * This module enforces the presence of required environment variables injected by Infisical.
 * It maps prefixed secrets (ORCH_*) to internal configuration keys.
 */

const REQUIRED_SECRETS = [
  'ORCH_GEMINI_API_KEY_ACTIVE',
  'ORCH_ANTHROPIC_API_KEY_ACTIVE',
  'ORCH_TELEMETRY_URL',
  'ORCH_REGION'
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
    geminiApiKey: process.env.ORCH_GEMINI_API_KEY_ACTIVE,
    anthropicApiKey: process.env.ORCH_ANTHROPIC_API_KEY_ACTIVE,
    telemetryUrl: process.env.ORCH_TELEMETRY_URL,
    region: process.env.ORCH_REGION,
    llamaUrl: process.env.ORCH_LLAMA_URL || 'http://localhost:8080'
  };
}

export const config = validateConfig();
