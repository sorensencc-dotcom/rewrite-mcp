#!/usr/bin/env node

/**
 * Validate NPM Scripts
 * Ensures all workflow npm run calls exist in package.json
 * Prevents silent failures when scripts are accidentally removed
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PACKAGE_JSON_PATH = path.join(ROOT, 'package.json');
const WORKFLOWS_DIR = path.join(ROOT, '.github', 'workflows');

// Extract npm scripts from workflow files
function getWorkflowScripts() {
  const scripts = new Set();

  if (!fs.existsSync(WORKFLOWS_DIR)) {
    return scripts;
  }

  const workflows = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.yml'));

  workflows.forEach(workflow => {
    const content = fs.readFileSync(path.join(WORKFLOWS_DIR, workflow), 'utf-8');
    const lines = content.split('\n');

    lines.forEach(line => {
      // Skip comments and echo statements
      if (line.trim().startsWith('#') || line.includes('echo')) {
        return;
      }

      // Match: npm run script-name (handles pipes, &&, etc)
      // Only in lines with "run:" prefix
      if (line.includes('run:')) {
        const matches = line.match(/npm run ([\w:-]+)/g);
        if (matches) {
          matches.forEach(match => {
            const script = match.replace('npm run ', '');
            scripts.add(script);
          });
        }
      }
    });
  });

  return scripts;
}

// Get available scripts from package.json
function getPackageScripts() {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
  return new Set(Object.keys(pkg.scripts || {}));
}

// Validate
function validate() {
  const workflowScripts = getWorkflowScripts();
  const packageScripts = getPackageScripts();

  const missing = Array.from(workflowScripts).filter(s => !packageScripts.has(s));
  const unused = Array.from(packageScripts).filter(s => !workflowScripts.has(s));

  console.log('\n📋 NPM Script Validation\n');
  console.log(`Workflows call: ${workflowScripts.size} scripts`);
  console.log(`package.json has: ${packageScripts.size} scripts\n`);

  if (missing.length > 0) {
    console.error('❌ MISSING (called by workflows, not in package.json):');
    missing.forEach(s => console.error(`   - npm run ${s}`));
    return false;
  }

  console.log('✅ All workflow scripts defined in package.json\n');
  return true;
}

// Exit with code 1 if validation fails
const isValid = validate();
process.exit(isValid ? 0 : 1);
