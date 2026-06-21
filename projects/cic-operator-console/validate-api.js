#!/usr/bin/env node

/**
 * Validation Script for Console v3 Mock API
 * Tests all endpoints for correct status codes and response shapes
 *
 * Usage:
 *   node validate-api.js
 */

const API_URL = 'http://localhost:8080';

const tests = [
  {
    name: 'GET /cic/health',
    method: 'GET',
    path: '/cic/health',
    validate: (data) => {
      if (!data.status) throw new Error('Missing status');
      if (typeof data.uptimePercent !== 'number') throw new Error('Missing uptimePercent');
      if (typeof data.activeServices !== 'number') throw new Error('Missing activeServices');
      return true;
    },
  },
  {
    name: 'GET /cic/pipelines',
    method: 'GET',
    path: '/cic/pipelines',
    validate: (data) => {
      if (!Array.isArray(data)) throw new Error('Expected array');
      if (data.length === 0) throw new Error('Empty pipelines');
      const p = data[0];
      if (!p.id || !p.name || typeof p.progressPercent !== 'number') throw new Error('Invalid pipeline shape');
      return true;
    },
  },
  {
    name: 'GET /cic/alerts',
    method: 'GET',
    path: '/cic/alerts',
    validate: (data) => {
      if (!Array.isArray(data)) throw new Error('Expected array');
      if (data.length === 0) throw new Error('Empty alerts');
      const a = data[0];
      if (!a.id || !a.severity || !a.title) throw new Error('Invalid alert shape');
      return true;
    },
  },
  {
    name: 'GET /cic/workspace',
    method: 'GET',
    path: '/cic/workspace',
    validate: (data) => {
      if (!data.user) throw new Error('Missing user');
      if (!data.user.name || !data.user.email) throw new Error('Invalid user shape');
      if (!Array.isArray(data.permissions)) throw new Error('Missing permissions');
      if (!Array.isArray(data.activityLog)) throw new Error('Missing activityLog');
      return true;
    },
  },
  {
    name: 'GET /cic/metrics',
    method: 'GET',
    path: '/cic/metrics',
    validate: (data) => {
      if (typeof data.cpuPercent !== 'number') throw new Error('Missing cpuPercent');
      if (typeof data.memoryPercent !== 'number') throw new Error('Missing memoryPercent');
      return true;
    },
  },
  {
    name: 'GET /agents',
    method: 'GET',
    path: '/agents',
    validate: (data) => {
      if (!Array.isArray(data)) throw new Error('Expected array');
      if (data.length === 0) throw new Error('Empty agents');
      const ag = data[0];
      if (!ag.id || !ag.name || !ag.status) throw new Error('Invalid agent shape');
      return true;
    },
  },
  {
    name: 'POST /agents/:id/invoke',
    method: 'POST',
    path: '/agents/agent-claude-code-guide/invoke',
    validate: (data) => {
      if (!data.success && !data.message) throw new Error('Expected success or message field');
      return true;
    },
  },
  {
    name: 'POST /agents/:id/pause',
    method: 'POST',
    path: '/agents/agent-claude-code-guide/pause',
    validate: (data) => {
      if (!data.success && !data.message) throw new Error('Expected success or message field');
      return true;
    },
  },
  {
    name: 'POST /agents/:id/restart',
    method: 'POST',
    path: '/agents/agent-claude-code-guide/restart',
    validate: (data) => {
      if (!data.success && !data.message) throw new Error('Expected success or message field');
      return true;
    },
  },
  {
    name: 'POST /cic/actions',
    method: 'POST',
    path: '/cic/actions',
    body: { action: 'start-phase' },
    validate: (data) => {
      if (!data.success && !data.message) throw new Error('Expected success or message field');
      return true;
    },
  },
];

async function runTest(test) {
  try {
    const options = {
      method: test.method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (test.body) {
      options.body = JSON.stringify(test.body);
    }

    const res = await fetch(`${API_URL}${test.path}`, options);

    if (!res.ok) {
      return { status: '❌ FAIL', reason: `HTTP ${res.status}` };
    }

    const data = await res.json();
    test.validate(data);

    return { status: '✅ PASS', reason: 'Valid response' };
  } catch (err) {
    return { status: '❌ FAIL', reason: err.message };
  }
}

async function main() {
  console.log(`\n🧪 Console v3 API Validation\n`);
  console.log(`Target: ${API_URL}\n`);

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await runTest(test);
    const symbol = result.status.includes('PASS') ? '✅' : '❌';
    console.log(`${symbol} ${test.name.padEnd(40)} ${result.reason}`);
    if (result.status.includes('PASS')) passed++;
    else failed++;
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('✅ All tests passed! Dashboard ready for validation.\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Check endpoints.\n');
    process.exit(1);
  }
}

main();
