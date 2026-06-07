/**
 * pms/src/loader/validatePromptPack.js
 * 2026-05-18 v1.0.0
 */
import Ajv from 'ajv';
import { promptPackSchema } from '../schema/promptPackSchema.js';
import { ValidationError } from '../errors.js';

const ajv = new Ajv();
const validate = ajv.compile(promptPackSchema);

export function validatePromptPack(pack) {
  const valid = validate(pack);
  if (!valid) {
    throw new ValidationError('Invalid prompt pack schema', { errors: validate.errors });
  }
  return true;
}