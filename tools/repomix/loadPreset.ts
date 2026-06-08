/**
 * File: loadPreset.ts
 * Date: 2026-06-07
 * Semver: 0.1.0
 *
 * Helper to load and retrieve Repomix command presets.
 */

import { readFileSync } from "fs";
import { join } from "path";

export type RepomixPresetName =
  | "json-default"
  | "json-compressed"
  | "remote-json"
  | "markdown-human"
  | "json-secretlint"
  | "cic-analysis";

export interface PresetConfig {
  description: string;
  args: string[];
  use_case: string;
}

export interface PresetFile {
  version: string;
  metadata: {
    description: string;
    lastUpdated: string;
  };
  presets: Record<RepomixPresetName, PresetConfig>;
}

const PRESET_PATH = join(__dirname, "repomix-presets.json");

export function getPreset(name: RepomixPresetName): PresetConfig {
  const raw = readFileSync(PRESET_PATH, "utf8");
  const parsed = JSON.parse(raw) as PresetFile;

  const preset = parsed.presets[name];
  if (!preset) {
    throw new Error(
      `Unknown Repomix preset: ${name}. Available: ${Object.keys(parsed.presets).join(", ")}`
    );
  }

  return preset;
}

export function listPresets(): Array<{ name: RepomixPresetName; description: string; useCase: string }> {
  const raw = readFileSync(PRESET_PATH, "utf8");
  const parsed = JSON.parse(raw) as PresetFile;

  return Object.entries(parsed.presets).map(([name, config]) => ({
    name: name as RepomixPresetName,
    description: config.description,
    useCase: config.use_case,
  }));
}

export function getPresetArgs(name: RepomixPresetName): string[] {
  return getPreset(name).args;
}
