/**
 * pms/src/loader/loadPromptPack.js
 * 2026-05-18 v1.0.0
 */
import fs from 'node:fs/promises';
import { validatePromptPack } from './validatePromptPack.js';
import { LoaderError } from '../errors.js';

export async function loadPromptPack(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const pack = JSON.parse(content);
    validatePromptPack(pack);
    return pack;
  } catch (error) {
    throw new LoaderError(`Failed to load prompt pack: ${error.message}`, { filePath, originalError: error });
  }
}