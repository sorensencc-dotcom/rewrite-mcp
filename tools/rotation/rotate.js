#!/usr/bin/env node

/**
 * CIC Secret Rotation Tool
 * 
 * Manages the rotation lifecycle for CIC secrets in Infisical.
 * 
 * Usage:
 *   node rotate.js --service <name> --provider <name> --key <value>   # Stage NEXT
 *   node rotate.js --service <name> --provider <name> --action cutover # NEXT -> ACTIVE
 *   node rotate.js --service <name> --provider <name> --action clear-next
 */

import { execSync } from 'child_process';
import minimist from 'minimist';

const argv = minimist(process.argv.slice(2));
const { service, provider, key, action = 'stage', env = 'dev' } = argv;

if (!service || !provider) {
  console.error("Usage: node rotate.js --service <name> --provider <name> [--key <val>] [--action <act>] [--env <env>]");
  process.exit(1);
}

const PREFIX_MAP = {
  orchestrator: 'ORCH',
  harvester: 'HARV',
  'control-plane': 'CP'
};

const prefix = PREFIX_MAP[service];
if (!prefix) {
  console.error(`Unknown service: ${service}. Available: ${Object.keys(PREFIX_MAP).join(', ')}`);
  process.exit(1);
}

const baseKey = `${prefix}_${provider.toUpperCase()}_API_KEY`;
const project = `cic-${service}`;

function runInfisical(cmd) {
  console.log(`> infisical ${cmd}`);
  try {
    return execSync(`infisical ${cmd}`, { stdio: 'inherit' });
  } catch (e) {
    console.error(`Infisical command failed: ${e.message}`);
    process.exit(1);
  }
}

async function rotate() {
  console.log(`[ROTATION] Service: ${service}, Provider: ${provider}, Action: ${action}, Env: ${env}`);

  switch (action) {
    case 'stage':
      if (!key) {
        console.error("--key is required for staging.");
        process.exit(1);
      }
      console.log(`Staging new key for ${baseKey}_NEXT...`);
      runInfisical(`secrets set --project ${project} --env ${env} ${baseKey}_NEXT=${key}`);
      runInfisical(`secrets set --project ${project} --env ${env} ${baseKey}_ROTATED_AT=${new Date().toISOString()}`);
      break;

    case 'cutover':
      console.log(`Cutting over ${baseKey}_NEXT to ${baseKey}_ACTIVE...`);
      // In a real implementation, we would use 'infisical secrets get' to fetch NEXT first.
      // For this skeleton, we assume the operator confirms the move.
      console.warn("Manual confirmation: Ensure NEXT is populated before cutover.");
      console.log("Run: infisical secrets get --project ${project} --env ${env} ${baseKey}_NEXT");
      console.log(`Then: infisical secrets set --project ${project} --env ${env} ${baseKey}_ACTIVE=<VALUE_FROM_NEXT>`);
      break;

    case 'clear-next':
      console.log(`Clearing ${baseKey}_NEXT...`);
      runInfisical(`secrets delete --project ${project} --env ${env} ${baseKey}_NEXT`);
      break;

    default:
      console.error(`Unknown action: ${action}`);
      process.exit(1);
  }

  console.log("[ROTATION] Operation complete.");
}

rotate();
