// Skill Runtime — Loader Module
// Loads and caches skills with validation

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let skillsCache = {};
let manifest = null;

export async function loadManifest() {
  if (manifest) return manifest;
  const manifestPath = resolve(__dirname, "../skills/manifest.json");
  const manifestText = readFileSync(manifestPath, "utf-8");
  manifest = JSON.parse(manifestText);
  return manifest;
}

export async function loadSkill(skillName) {
  if (skillsCache[skillName]) {
    return skillsCache[skillName];
  }

  const m = await loadManifest();
  const skillDef = m.skills[skillName];

  if (!skillDef) {
    throw new Error(`Skill not found: ${skillName}`);
  }

  if (skillDef.deployed) {
    throw new Error(`Deployed skill '${skillName}' must be loaded separately`);
  }

  const entryPath = resolve(__dirname, `../skills/${skillDef.entry}`);
  const module = await import(entryPath);

  const skillFunc = module.default || Object.values(module)[0];
  if (!skillFunc) {
    throw new Error(`No export found in ${skillDef.entry}`);
  }

  skillsCache[skillName] = { func: skillFunc, def: skillDef };
  return skillsCache[skillName];
}

export async function getAvailableSkills() {
  const m = await loadManifest();
  return Object.keys(m.skills);
}

export async function getSkillsByPlatform(platform) {
  const m = await loadManifest();
  return Object.entries(m.skills)
    .filter(([, def]) => def.platforms && def.platforms.includes(platform))
    .map(([name]) => name);
}

export async function clearCache() {
  skillsCache = {};
}
