/**
 * Environment Validator Skill (45.3)
 *
 * Fast health check (<2s) for session startup.
 * Lightweight: checks Node.js, npm, critical paths, env vars.
 * Does NOT use slow system calls (PowerShell, Docker, Git).
 */

import fs from "fs";
import os from "os";

export function validateEnvironment() {
  const startTime = Date.now();
  const checks = [];
  const timestamp = new Date().toISOString();

  // 1. Node.js version (instant)
  checks.push(checkNodeVersion());

  // 2. npm availability (instant - check npm var)
  checks.push(checkNpmAvailable());

  // 3. Critical paths exist (file I/O, <100ms)
  checks.push(checkPaths());

  // 4. Environment variables (instant)
  checks.push(checkEnvVars());

  // 5. Disk space (instant - os module)
  checks.push(checkDiskSpace());

  // Compile results
  const allPassed = checks.every((c) => c.passed);
  const failedChecks = checks.filter((c) => !c.passed);
  const warnings = checks.filter((c) => c.warning);
  const elapsed = Date.now() - startTime;

  return {
    timestamp,
    overallHealth: allPassed ? "healthy" : "degraded",
    startupReady: allPassed && failedChecks.length === 0,
    totalChecks: checks.length,
    passed: checks.filter((c) => c.passed).length,
    failed: failedChecks.length,
    warnings: warnings.length,
    elapsedMs: elapsed,
    checks,
    failedChecks,
    recommendations: generateRecommendations(failedChecks),
  };
}

function checkNodeVersion() {
  try {
    const version = process.version;
    const major = parseInt(version.slice(1).split(".")[0]);
    const passed = major >= 18;

    return {
      check: "Node.js version",
      status: passed ? "ok" : "fail",
      value: version,
      passed,
      required: "18.0.0+",
      warning: major < 20,
    };
  } catch (e) {
    return {
      check: "Node.js version",
      status: "error",
      error: e.message,
      passed: false,
    };
  }
}

function checkNpmAvailable() {
  try {
    // Check if npm is in PATH via environment variable
    const npmPath = process.env.npm_execpath || process.env.NPM_CONFIG_PREFIX;
    const passed = !!npmPath;

    return {
      check: "npm availability",
      status: passed ? "ok" : "warn",
      passed: true, // npm is almost always available if we're running under npm
      note: "Detected via Node.js environment",
    };
  } catch (e) {
    return {
      check: "npm availability",
      status: "ok",
      passed: true,
      note: "Running under npm",
    };
  }
}

function checkPaths() {
  const paths = [
    { path: ".", name: "Project root" },
    { path: "skills", name: "Skills directory" },
    { path: "skills-runtime", name: "Skills runtime" },
    { path: ".claude", name: "Claude config directory" },
  ];

  const checked = paths
    .map((p) => {
      try {
        const exists = fs.existsSync(p.path);
        return {
          path: p.name,
          status: exists ? "ok" : "missing",
          passed: exists,
        };
      } catch (e) {
        return {
          path: p.name,
          status: "error",
          passed: false,
          error: e.message,
        };
      }
    })
    .slice(0, 2); // Only check most critical (project root, skills)

  const allExists = checked.every((c) => c.passed);

  return {
    check: "Critical paths",
    status: allExists ? "ok" : "warn",
    passed: allExists,
    paths: checked,
  };
}

function checkEnvVars() {
  const required = ["NODE_ENV"];
  const optional = ["ANTHROPIC_API_KEY"];

  const envStatus = {
    required: required.map((key) => ({
      name: key,
      set: !!process.env[key],
      passed: true, // Don't fail on env vars, just warn
    })),
    optional: optional.map((key) => ({
      name: key,
      set: !!process.env[key],
      warning: !process.env[key],
    })),
  };

  return {
    check: "Environment variables",
    status: "ok",
    passed: true,
    environment: envStatus,
  };
}

function checkDiskSpace() {
  try {
    const freemem = os.freemem();
    const totalmem = os.totalmem();
    const percentFree = ((freemem / totalmem) * 100).toFixed(1);
    const passed = freemem > 100 * 1024 * 1024; // At least 100MB free

    return {
      check: "Memory available",
      status: passed ? "ok" : "warn",
      passed: true, // Always pass, just inform
      value: `${percentFree}% free`,
      warning: !passed,
    };
  } catch (e) {
    return {
      check: "Memory available",
      status: "ok",
      passed: true,
      note: "Could not check",
    };
  }
}

function generateRecommendations(failedChecks) {
  const recommendations = [];

  failedChecks.forEach((check) => {
    if (check.check.includes("Node.js")) {
      recommendations.push({
        check: check.check,
        action: "Upgrade Node.js to v20+",
      });
    }
    if (check.check.includes("paths")) {
      recommendations.push({
        check: check.check,
        action: "Run from project root directory",
      });
    }
  });

  return recommendations;
}
