/**
 * pms-claude/src/registry/registry.js
 * 2026-05-18 v1.0.0
 */
export class PromptRegistry {
  constructor() {
    this.packs = new Map();
  }

  register(pack) {
    const key = `${pack.name}@${pack.version}`;
    this.packs.set(key, pack);
  }

  get(name, version) {
    return this.packs.get(`${name}@${version}`);
  }
}

export const registry = new PromptRegistry();