/**
 * skillRegistryLoader.mjs - v0.1.0
 * ESM loader for trained Redesign skill
 */

import fs from 'node:fs';
import path from 'node:path';
import { log } from '../logging/logger.js';

const MODULE = 'SkillRegistryLoader';

/**
 * Load a trained redesign skill from disk.
 * @param {Object} config
 * @param {string} config.skillsDir - path to skills root (e.g., ./skills)
 * @param {boolean} config.devMode - enable file watching (default: false)
 * @returns {{ name: string, version: string, raw: string, path: string }}
 * @throws {Error} if skill not found
 */
export function loadRedesignSkill({ skillsDir = './skills', devMode = false } = {}) {
  const skillPath = path.join(skillsDir, 'rewritelabs', 'redesign', 'best_skill.md');

  if (!fs.existsSync(skillPath)) {
    throw new Error(`[${MODULE}] Redesign skill not found at ${skillPath}`);
  }

  const raw = fs.readFileSync(skillPath, 'utf8');

  // Extract version from YAML frontmatter
  const versionMatch = raw.match(/^---\n[\s\S]*?version:\s*([0-9]+\.[0-9]+\.[0-9]+)/m);
  const version = versionMatch?.[1] ?? '0.0.0';

  log.info('skill_loaded', {
    module: MODULE,
    skill: 'RewriteLabs Redesign',
    version,
    path: skillPath,
  });

  // Dev mode: watch for changes
  if (devMode) {
    fs.watch(skillPath, (eventType) => {
      if (eventType === 'change') {
        log.warn('skill_changed', {
          module: MODULE,
          skill: 'RewriteLabs Redesign',
          msg: 'Skill file changed in devMode. Restart to reload.',
        });
      }
    });
  }

  return {
    name: 'RewriteLabs Redesign',
    version,
    raw,
    path: skillPath,
  };
}
