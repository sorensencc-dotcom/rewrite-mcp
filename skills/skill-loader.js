// Dynamic Skill Loader
// Loads skills on-demand from manifest

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let skillsCache = {};
let manifest = null;

export async function loadManifest() {
  if (manifest) return manifest;
  const manifestPath = resolve(__dirname, "./manifest.json");
  const manifestText = readFileSync(manifestPath, "utf-8");
  manifest = JSON.parse(manifestText);
  return manifest;
}

export async function loadSkill(skillName) {
  if (skillsCache[skillName]) return skillsCache[skillName];

  const m = await loadManifest();
  const skillDef = m.skills[skillName];

  if (!skillDef || skillDef.deployed) {
    throw new Error(`Skill not found or not yet scaffolded: ${skillName}`);
  }

  const entryPath = resolve(__dirname, skillDef.entry);
  const module = await import(entryPath);

  // Expect the skill function to be the default export or named export matching skillName
  const skillFunc = module.default || Object.values(module)[0];
  if (!skillFunc) throw new Error(`No export found in ${skillDef.entry}`);

  skillsCache[skillName] = skillFunc;
  return skillFunc;
}

export async function loadSkillSchema(skillName) {
  const m = await loadManifest();
  const skillDef = m.skills[skillName];

  if (!skillDef) throw new Error(`Skill not found: ${skillName}`);

  const schemaPath = resolve(__dirname, skillDef.schema);
  const schemaText = readFileSync(schemaPath, "utf-8");
  return JSON.parse(schemaText);
}

export async function getAvailableSkills() {
  const m = await loadManifest();
  return Object.keys(m.skills);
}

export async function getSkillsByPlatform(platform) {
  const m = await loadManifest();
  return Object.entries(m.skills)
    .filter(([name, def]) => def.platforms && def.platforms.includes(platform))
    .map(([name]) => name);
}
