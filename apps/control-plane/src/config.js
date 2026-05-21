/**
 * src/config.js
 * Infisical Secret Plane Guardrails (Control Plane)
 */

const REQUIRED_SECRETS = [
  'CP_GOOGLE_CLIENT_ID',
  'CP_ALLOWED_EMAILS',
  'CP_TELEMETRY_URL',
  'CP_REGION'
];

function validateConfig() {
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
    googleClientId: process.env.CP_GOOGLE_CLIENT_ID,
    allowedEmails: process.env.CP_ALLOWED_EMAILS,
    telemetryUrl: process.env.CP_TELEMETRY_URL,
    region: process.env.CP_REGION,
    authDisabled: process.env.CP_AUTH_DISABLED === 'true'
  };
}

module.exports = {
  config: validateConfig()
};
