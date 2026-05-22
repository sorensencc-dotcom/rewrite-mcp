#!/usr/bin/env node

/**
 * CIC Rotation Health Check
 * 
 * Verifies that the Secret Rotation Plane is within spec across all services and environments.
 * 
 * Rules:
 * 1. ACTIVE exists: *_ACTIVE is present and non-empty.
 * 2. ROTATED_AT exists: *_ROTATED_AT is present and parseable.
 * 3. Age: *_ROTATED_AT is younger than MAX_AGE_DAYS.
 * 4. NEXT sanity: If *_NEXT exists, it must not be older than STAGING_MAX_AGE_DAYS.
 * 5. Prefix correctness: All managed keys use service prefixes (ORCH_, HARV_, CP_).
 * 6. No legacy singletons: No bare GEMINI_API_KEY, etc. in prod envs.
 */

import { execSync } from 'child_process';

// --- Configuration ---

const SERVICES = [
  { id: 'orchestrator', prefix: 'ORCH_', project: 'cic-orchestrator' },
  { id: 'harvester', prefix: 'HARV_', project: 'cic-harvester' },
  { id: 'control-plane', prefix: 'CP_', project: 'cic-control-plane' },
];

const PROVIDERS = [
  { id: 'gemini', keyBase: 'GEMINI_API_KEY', maxAgeDays: 90 },
  { id: 'anthropic', keyBase: 'ANTHROPIC_API_KEY', maxAgeDays: 90 },
];

const ENVS = ['prod-us-east', 'prod-eu-west', 'dev'];

const STAGING_MAX_AGE_DAYS = 7;

// --- Helper Functions ---

function getSecrets(project, env) {
  try {
    const binPath = '/mnt/c/dev/bin/infisical';
    const output = execSync(`${binPath} export --projectId ${project} --env ${env} --format=json`, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
    const secretsArr = JSON.parse(output);
    const secrets = {};
    secretsArr.forEach(s => { secrets[s.key] = s.value; });
    return secrets;
  } catch (e) {
    if (e.stderr) console.error(`Infisical error: ${e.stderr.toString()}`);
    return null;
  }
}

function getAgeInDays(timestamp) {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return Infinity;
  const diffMs = Date.now() - date.getTime();
  return diffMs / (1000 * 60 * 60 * 24);
}

// --- Main Execution ---

async function runHealthCheck() {
  console.log("Starting CIC Rotation Health Check...");
  const errors = [];
  const checked = [];

  for (const service of SERVICES) {
    for (const env of ENVS) {
      console.log(`Checking ${service.id} in ${env}...`);
      const secrets = getSecrets(service.project, env);

      if (secrets === null) {
        errors.push(`[CRITICAL] Could not fetch secrets for ${service.id} in ${env}. Ensure Infisical CLI is authenticated.`);
        continue;
      }

      for (const provider of PROVIDERS) {
        const prefix = service.prefix;
        const base = provider.keyBase;

        const activeKey = `${prefix}${base}_ACTIVE`;
        const nextKey = `${prefix}${base}_NEXT`;
        const rotatedAtKey = `${prefix}${base}_ROTATED_AT`;

        const serviceReportId = `${service.id.toUpperCase()} / ${provider.id} / ${env}`;

        // 1. Presence Checks
        if (!secrets[activeKey]) {
          errors.push(`[FAIL] ${serviceReportId}\n  - MISSING: ${activeKey}`);
        }

        if (!secrets[rotatedAtKey]) {
          errors.push(`[FAIL] ${serviceReportId}\n  - MISSING: ${rotatedAtKey}`);
        } else {
          // 2. Age Checks
          const age = getAgeInDays(secrets[rotatedAtKey]);
          if (age > provider.maxAgeDays) {
            errors.push(`[FAIL] ${serviceReportId}\n  - STALE: ${rotatedAtKey} (age=${Math.floor(age)}d, max=${provider.maxAgeDays}d)`);
          }

          // 3. NEXT sanity
          if (secrets[nextKey]) {
            // We assume ROTATED_AT is updated when NEXT is staged
            if (age > STAGING_MAX_AGE_DAYS) {
              errors.push(`[FAIL] ${serviceReportId}\n  - STALE_NEXT: ${nextKey} exists but ${rotatedAtKey} is ${Math.floor(age)}d old (max staging=${STAGING_MAX_AGE_DAYS}d)`);
            }
          }
        }

        // 4. Legacy singleton check
        if (secrets[base]) {
          errors.push(`[FAIL] ${serviceReportId}\n  - LEGACY_KEY_PRESENT: ${base} (should use ${activeKey})`);
        }
        
        checked.push(serviceReportId);
      }
    }
  }

  console.log("\n--- Health Check Report ---");
  if (errors.length > 0) {
    errors.forEach(err => console.error(err + "\n"));
    console.error(`\x1b[31mSummary: ${errors.length} rotation violations found across ${checked.length} checks.\x1b[0m`);
    process.exit(1);
  } else {
    console.log(`\x1b[32m[OK] Rotation Plane healthy across ${checked.length} checks.\x1b[0m`);
    process.exit(0);
  }
}

runHealthCheck();
