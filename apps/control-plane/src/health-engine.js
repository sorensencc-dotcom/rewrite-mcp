/**
 * health-engine.js
 * 
 * Logic to load and execute health check manifests for the CIC Control Plane.
 * @version 1.0.0
 * @date 2026-05-21
 */

'use strict';

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class HealthCheckEngine {
  /**
   * @param {string} manifestPath - Absolute path to the healthcheck.json
   */
  constructor(manifestPath) {
    this.manifestPath = manifestPath;
    // Assume workspace root is 4 levels up from this file:
    // apps/control-plane/src/health-engine.js -> apps -> control-plane -> rewrite-mcp -> dev
    // Wait, the structure is /mnt/c/dev/rewrite-mcp/apps/control-plane/src
    // So 1:src, 2:control-plane, 3:apps, 4:rewrite-mcp
    // Workspace root (dev) is 5 levels up.
    this.workspaceRoot = path.resolve(__dirname, '../../../../');
  }

  async run() {
    const manifestRaw = await fs.readFile(this.manifestPath, 'utf8');
    const manifest = JSON.parse(manifestRaw);
    
    const results = {
      name: manifest.name,
      baseline_version: manifest.baseline_version,
      ts: new Date().toISOString(),
      checks: []
    };

    // Run checks in parallel
    const checkPromises = manifest.checks.map(check => this.executeCheck(check));
    results.checks = await Promise.all(checkPromises);

    results.all_passed = results.checks.every(c => c.passed);
    return results;
  }

  async executeCheck(check) {
    const t0 = Date.now();
    const result = {
      id: check.id,
      name: check.name,
      severity: check.severity,
      passed: false,
      duration_ms: 0,
      output: '',
      error: null
    };

    try {
      let command = check.command;
      if (check.type === 'vitest') {
        // Construct vitest command if not explicitly provided
        command = command || `npx vitest run ${check.pattern} --no-watch`;
      }

      const options = {
        cwd: path.resolve(this.workspaceRoot, check.cwd),
        timeout: (check.timeout_seconds || 60) * 1000,
        env: { ...process.env, CI: 'true' } // Ensure non-interactive
      };

      const { stdout, stderr } = await this.execPromise(command, options);
      result.passed = true;
      result.output = stdout + stderr;
    } catch (err) {
      // Check if it failed with an expected exit code
      const expectedCode = check.expected_exit_code ?? 0;
      if (err.code === expectedCode && expectedCode !== 0) {
        result.passed = true;
      } else {
        result.passed = false;
      }
      
      result.output = (err.stdout || '') + (err.stderr || '');
      result.error = err.message;
      if (err.killed) result.error = 'Timeout exceeded';
    } finally {
      result.duration_ms = Date.now() - t0;
    }

    return result;
  }

  execPromise(command, options) {
    return new Promise((resolve, reject) => {
      exec(command, options, (error, stdout, stderr) => {
        if (error) {
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }
}

module.exports = { HealthCheckEngine };
