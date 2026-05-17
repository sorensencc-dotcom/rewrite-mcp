/**
 * CIC v3.0 — Agent Registry Tests
 * File: cic/tests/agents.test.js | Version: 1.0.0 | Date: 2026-05-15
 */

import { createAgentRegistry, registerAgent, getAgent } from '../agents/registry.js';

export function testAgentRegistry() {
  const registry = createAgentRegistry();

  const agent = {
    name: 'TestAgent',
    version: '1.0.0',
    async execute(ctx) { return { ok: true }; },
  };

  registerAgent(registry, agent);
  const found = getAgent(registry, 'TestAgent');
  if (!found) throw new Error('Agent not found after registration');
  if (found.name !== 'TestAgent') throw new Error('Agent name mismatch');

  let threw = false;
  try { getAgent(registry, 'NonExistent'); } catch { threw = true; }
  if (!threw) throw new Error('Expected error for missing agent');

  let invalidThrew = false;
  try { registerAgent(registry, { name: 'Bad' }); } catch { invalidThrew = true; }
  if (!invalidThrew) throw new Error('Expected error for invalid agent contract');
}
