/**
 * pms-headless/src/runner/headlessRunner.js
 * 2026-05-18 v1.0.0
 */
import { assemblePrompt } from '../assembler/assemblePrompt.js';
import { HeadlessError } from '../errors.js';
import { logger } from '../logger.js';

export async function runHeadless(pack, executor) {
  logger.log('info', 'Starting headless execution', { pack: pack.name, version: pack.version });
  
  try {
    const payload = assemblePrompt(pack);
    const result = await executor(payload.prompt);
    
    logger.log('info', 'Execution complete', { pack: pack.name });
    
    return {
      status: 'success',
      pack: pack.name,
      version: pack.version,
      result
    };
  } catch (error) {
    logger.log('error', 'Execution failed', { pack: pack.name, error: error.message });
    throw new HeadlessError('Headless execution failed', { originalError: error });
  }
}