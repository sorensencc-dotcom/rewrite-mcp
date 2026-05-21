// filename: src/prompts/loader.js
// date: 2026-05-18
// version: 1.0.0
// description: CIC Prompt Management System — Prompt File Loader
//              Pure, synchronous, no caching, no global state.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';

/**
 * Loads a single .prompt file from disk and returns its UTF-8 string content.
 *
 * @param {string} promptPath  Path to the .prompt file. Absolute or relative.
 * @param {string} [baseDir]   Base directory for resolving relative paths.
 *                             Defaults to process.cwd().
 * @returns {string}           Full file contents as a UTF-8 string.
 * @throws {Error}             If the file does not exist, cannot be read, or is empty.
 */
export function loadPrompt(promptPath, baseDir = process.cwd()) {
  if (typeof promptPath !== 'string' || promptPath.trim().length === 0) {
    throw new Error(
      '[loader] loadPrompt: promptPath must be a non-empty string; ' +
      `received: ${JSON.stringify(promptPath)}`
    );
  }

  if (typeof baseDir !== 'string' || baseDir.trim().length === 0) {
    throw new Error(
      '[loader] loadPrompt: baseDir must be a non-empty string; ' +
      `received: ${JSON.stringify(baseDir)}`
    );
  }

  const absolutePath = isAbsolute(promptPath)
    ? promptPath
    : resolve(baseDir, promptPath);

  if (!existsSync(absolutePath)) {
    throw new Error(
      `[loader] Prompt file not found: "${absolutePath}" ` +
      `(resolved from path="${promptPath}" baseDir="${baseDir}")`
    );
  }

  let content;
  try {
    content = readFileSync(absolutePath, 'utf-8');
  } catch (cause) {
    throw new Error(
      `[loader] Failed to read prompt file: "${absolutePath}" — ${cause.message}`,
      { cause }
    );
  }

  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new Error(
      `[loader] Prompt file is empty: "${absolutePath}"`
    );
  }

  return content;
}

/**
 * Loads multiple .prompt files by path map.
 * Returns a map of logical name → file content.
 * Fails fast: throws on first missing or empty file.
 *
 * @param {Record<string, string>} pathMap   { logicalName: filePath }
 * @param {string}                 [baseDir] Base directory for relative paths.
 * @returns {Record<string, string>}         { logicalName: fileContent }
 * @throws {Error}                           On any load failure.
 */
export function loadAll(pathMap, baseDir = process.cwd()) {
  if (pathMap === null || typeof pathMap !== 'object' || Array.isArray(pathMap)) {
    throw new Error(
      '[loader] loadAll: pathMap must be a plain object; ' +
      `received: ${JSON.stringify(pathMap)}`
    );
  }

  const result = {};
  for (const [name, path] of Object.entries(pathMap)) {
    result[name] = loadPrompt(path, baseDir);
  }
  return result;
}
