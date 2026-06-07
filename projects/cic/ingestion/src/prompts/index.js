// filename: src/prompts/index.js
// date: 2026-05-18
// version: 1.0.0
// description: CIC Prompt Management System — Prompt Index
//              Exposes named prompt accessors. Lazy, pure, no global state.

import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPrompt } from './loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const require = createRequire(import.meta.url);

/** @type {{ version: string, updated: string, prompts: Record<string, string> }} */
const registry = (() => {
  const registryPath = resolve(__dirname, '../../prompts/prompts.json');
  try {
    return require(registryPath);
  } catch (cause) {
    throw new Error(
      `[index] Failed to load prompt registry at "${registryPath}" — ${cause.message}`,
      { cause }
    );
  }
})();

/**
 * Base directory for resolving registry-relative prompt paths.
 * All paths in prompts.json are relative to the project root,
 * which is two levels up from src/prompts/.
 */
const BASE_DIR = resolve(__dirname, '../../');

/**
 * Validates that a logical name exists in the registry.
 * @param {string} name
 * @returns {string} The file path from the registry.
 * @throws {Error} If the name is not registered.
 */
function requireRegistered(name) {
  const path = registry.prompts?.[name];
  if (typeof path !== 'string' || path.trim().length === 0) {
    throw new Error(
      `[index] Prompt "${name}" is not registered in prompts.json. ` +
      `Available keys: ${Object.keys(registry.prompts ?? {}).join(', ')}`
    );
  }
  return path;
}

/**
 * Loads a prompt by its logical registry name.
 * Pure: no caching, each call performs a fresh disk read.
 *
 * @param {string} name  Logical name (e.g. "cic", "extractor")
 * @returns {string}     Full prompt text as UTF-8 string.
 * @throws {Error}       If name is not registered or file cannot be loaded.
 */
export function getPrompt(name) {
  const path = requireRegistered(name);
  return loadPrompt(path, BASE_DIR);
}

/**
 * Prompt accessor object. Each property performs a fresh disk read on access.
 * Compatible with destructuring: const { cic, extractor } = prompts;
 * Note: destructured values are strings captured at destructure time.
 */
export const prompts = Object.freeze({
  get cic() {
    return getPrompt('cic');
  },
  get extractor() {
    return getPrompt('extractor');
  },
  get normalizer() {
    return getPrompt('normalizer');
  },
  get schema() {
    return getPrompt('schema');
  },
});

/**
 * Returns the raw registry object (version, updated, prompts map).
 * Pure read — returns a new copy each call.
 *
 * @returns {{ version: string, updated: string, prompts: Record<string, string> }}
 */
export function getRegistry() {
  return { ...registry, prompts: { ...registry.prompts } };
}

/**
 * Returns the list of all registered logical prompt names.
 *
 * @returns {string[]}
 */
export function listPromptNames() {
  return Object.keys(registry.prompts ?? {});
}
