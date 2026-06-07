// File: projects/cic/ingestion/src/playbook/PlaybookPublisher.js | Date: 2026-05-31 | v1.0.0

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLAYBOOKS_DIR = path.resolve(__dirname, '../../playbooks');
const CURRENT_PLAYBOOK_FILE = path.join(PLAYBOOKS_DIR, 'playbook.current.json');
const HISTORY_FILE = path.join(PLAYBOOKS_DIR, 'playbook.history.jsonl');

// Memory cache for rollback (< 100ms recovery target)
let memoryRollbackCache = null;
let governanceLocked = false;

async function ensurePlaybooksDir() {
  await fs.mkdir(PLAYBOOKS_DIR, { recursive: true });
}

/**
 * Gets the operational governance lock status.
 * @returns {boolean} True if governance is locked.
 */
export function isGovernanceLocked() {
  return governanceLocked;
}

/**
 * Freezes the evolution cycle.
 */
export function freezeEvolution() {
  governanceLocked = true;
  return { success: true, status: 'frozen' };
}

/**
 * Unfreezes the evolution cycle.
 */
export function unfreezeEvolution() {
  governanceLocked = false;
  return { success: true, status: 'active' };
}

/**
 * Evaluates simulated candidates and promotes the optimal candidate.
 * 
 * @param {Object} currentPlaybook - The operational active playbook.
 * @param {Array<Object>} simulatedCandidates - Replay results from SimulationRunner.
 * @param {Array<Object>} plannerCandidates - Original candidate wrappers.
 * @returns {Promise<Object>} Promotion summary: { promoted: boolean, reason, version }
 */
export async function evaluateAndPromote(currentPlaybook, simulatedCandidates = [], plannerCandidates = []) {
  if (governanceLocked) {
    return {
      promoted: false,
      reason: 'Governance veto: Evolution cycle is frozen.',
      status: 'frozen'
    };
  }

  // Weight constants
  const W_ACCURACY = 0.5;
  const W_LATENCY = 0.3; // Latency delta is negative for reduction
  const W_CONTRADICTIONS = 0.2;

  let bestCandidate = null;
  let bestScore = 0; // Relative score improvement must be > 0

  for (const sim of simulatedCandidates) {
    if (!sim.sloPass) continue;

    // Relative aggregate score (higher is better)
    // -sim.latencyDelta because lower latency gives negative delta, which is an improvement
    const score = (W_ACCURACY * sim.accuracyDelta) - (W_LATENCY * sim.latencyDelta) - (W_CONTRADICTIONS * sim.contradictionDelta);
    
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = {
        sim,
        score,
        wrapper: plannerCandidates.find(c => c.id === sim.candidate)
      };
    }
  }

  if (bestCandidate && bestCandidate.wrapper) {
    const candidatePb = bestCandidate.wrapper.playbook;
    
    // Assign a new version timestamp
    candidatePb.version = `pb-${new Date().toISOString().slice(0, 10)}-${Date.now().toString().slice(-4)}`;
    
    const result = await promotePlaybook(candidatePb, bestCandidate.score, bestCandidate.sim.mutation);
    return {
      promoted: true,
      reason: `Promoted due to score improvement of +${bestCandidate.score.toFixed(3)} via ${bestCandidate.sim.mutation}`,
      version: candidatePb.version,
      metrics: bestCandidate.sim,
      ...result
    };
  }

  return {
    promoted: false,
    reason: 'No candidate outperformed the active playbook while satisfying SLO limits.'
  };
}

/**
 * Promotes a specific playbook configuration to operational status.
 * Saves current config in a memory cache to support fast rollbacks (< 100ms).
 * 
 * @param {Object} playbook - The target playbook JSON.
 * @param {number} score - Aggregate evolution score.
 * @param {string} mutation - Description of mutation.
 * @returns {Promise<Object>}
 */
export async function promotePlaybook(playbook, score = 0.0, mutation = 'manual') {
  try {
    await ensurePlaybooksDir();
    
    // Backup active playbook to memory cache for fast rollback
    try {
      const activeContent = await fs.readFile(CURRENT_PLAYBOOK_FILE, 'utf-8');
      memoryRollbackCache = JSON.parse(activeContent);
    } catch (err) {
      memoryRollbackCache = null; // No previous baseline
    }

    const payload = JSON.stringify(playbook, null, 2);
    await fs.writeFile(CURRENT_PLAYBOOK_FILE, payload, 'utf-8');

    // Append to audit trail
    const auditLog = {
      event: 'playbook.updated',
      timestamp: new Date().toISOString(),
      version: playbook.version,
      mutation,
      score,
      playbook
    };
    await fs.appendFile(HISTORY_FILE, JSON.stringify(auditLog) + '\n', 'utf-8');

    return { success: true, version: playbook.version };
  } catch (error) {
    console.error(`[PlaybookPublisher] Promotion failed: ${error.message}`);
    throw error;
  }
}

/**
 * Rollback the current playbook to the previous operational baseline in < 100ms.
 * 
 * @returns {Promise<Object>} Rollback result.
 */
export async function rollbackPlaybook() {
  const t0 = performance.now();
  if (!memoryRollbackCache) {
    return {
      success: false,
      reason: 'No rollback target in memory cache.'
    };
  }

  try {
    await ensurePlaybooksDir();
    const payload = JSON.stringify(memoryRollbackCache, null, 2);
    await fs.writeFile(CURRENT_PLAYBOOK_FILE, payload, 'utf-8');

    const rollbackVersion = memoryRollbackCache.version;

    // Append rollback event to audit log
    const auditLog = {
      event: 'playbook.rollback',
      timestamp: new Date().toISOString(),
      version: rollbackVersion,
      durationMs: performance.now() - t0
    };
    await fs.appendFile(HISTORY_FILE, JSON.stringify(auditLog) + '\n', 'utf-8');

    // Wipe memory cache target to avoid double rollback loops
    const temp = memoryRollbackCache;
    memoryRollbackCache = null;

    const duration = performance.now() - t0;

    return {
      success: true,
      reason: 'Playbook rolled back to last operational config successfully',
      version: rollbackVersion,
      durationMs: Math.round(duration * 100) / 100
    };
  } catch (error) {
    console.error(`[PlaybookPublisher] Rollback failed: ${error.message}`);
    return {
      success: false,
      reason: `Rollback failed: ${error.message}`
    };
  }
}

/**
 * Loads the active operational playbook from file.
 * 
 * @returns {Promise<Object>} Playbook object.
 */
export async function loadCurrentPlaybook() {
  try {
    await ensurePlaybooksDir();
    const data = await fs.readFile(CURRENT_PLAYBOOK_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    // If not found, load baseline seed
    try {
      const seedFile = path.join(PLAYBOOKS_DIR, 'baseline-v1.0.0.json');
      const seed = await fs.readFile(seedFile, 'utf-8');
      const parsed = JSON.parse(seed);
      await fs.writeFile(CURRENT_PLAYBOOK_FILE, seed, 'utf-8');
      return parsed;
    } catch (err2) {
      // Inline fallback seed if all files are missing
      return {
        version: "pb-provisional-01",
        stages: [
          { name: "SemanticExtractor", mode: "serial", weight: 0.9 }
        ],
        rules: { skipIf: [], forceRun: [] }
      };
    }
  }
}

/**
 * Loads the playbook promotion and event logs history.
 * 
 * @returns {Promise<Array<Object>>} List of logs.
 */
export async function getPlaybookHistory() {
  try {
    const data = await fs.readFile(HISTORY_FILE, 'utf-8');
    return data.split('\n')
      .filter(l => l.trim().length > 0)
      .map(l => JSON.parse(l));
  } catch (err) {
    return [];
  }
}

export default {
  evaluateAndPromote,
  promotePlaybook,
  rollbackPlaybook,
  loadCurrentPlaybook,
  getPlaybookHistory,
  isGovernanceLocked,
  freezeEvolution,
  unfreezeEvolution
};
