/**
 * pms-strict/src/loader/loadPromptPack.js
 */
import fs from 'node:fs/promises';
import Ajv from 'ajv';
import { promptPackSchema } from '../schema/promptPackSchema.js';
import { StrictError } from '../errors.js';

const ajv = new Ajv();
const validate = ajv.compile(promptPackSchema);

export async function loadPromptPack(path) {
  const content = await fs.readFile(path, 'utf-8');
  const pack = JSON.parse(content);
  
  if (!validate(pack)) {
    throw new StrictError('Invalid Strict Prompt Pack', { errors: validate.errors });
  }
  
  return pack;
}