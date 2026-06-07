/**
 * pms-headless/src/loader/loadPromptPack.js
 */
import fs from 'node:fs/promises';

export async function loadPromptPack(path) {
  const content = await fs.readFile(path, 'utf-8');
  return JSON.parse(content);
}