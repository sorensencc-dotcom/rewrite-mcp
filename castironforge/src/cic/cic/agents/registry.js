/**
 * CIC v3.0 — Agent Registry
 * File: cic/agents/registry.js | Version: 1.0.0 | Date: 2026-05-15
 */

export function createAgentRegistry() {
  return new Map();
}

export function registerAgent(registry, agent) {
  if (!agent?.name || typeof agent.execute !== 'function') {
    throw new Error('CIC_AGENT_INVALID_CONTRACT: agent must have name and execute()');
  }
  registry.set(agent.name, agent);
}

export function getAgent(registry, name) {
  const agent = registry.get(name);
  if (!agent) throw new Error(`CIC_AGENT_NOT_FOUND: ${name}`);
  return agent;
}
