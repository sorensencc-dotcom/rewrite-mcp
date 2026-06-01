// File: projects/cic/ingestion/src/playbook/index.js | Date: 2026-05-31 | v1.0.0

import {
  getRollingWindow,
  addTelemetryEvent,
  resetTelemetryWindow,
  generateFeatureVectors
} from './TelemetryIngestor.js';

import {
  analyzePatterns
} from './PatternAnalyzer.js';

import {
  generateCandidates
} from './EvolutionPlanner.js';

import {
  simulateCandidate
} from './SimulationRunner.js';

import {
  evaluateAndPromote,
  promotePlaybook,
  rollbackPlaybook,
  loadCurrentPlaybook,
  getPlaybookHistory,
  isGovernanceLocked,
  freezeEvolution,
  unfreezeEvolution
} from './PlaybookPublisher.js';

/**
 * Runs a complete self-optimization, telemetry-driven evolution cycle:
 * Telemetry Ingestion -> Pattern Analysis -> Candidate Generation -> Simulation Replay -> Promotion
 * 
 * @param {Object} [options] - Optional configurations.
 * @param {number} [options.minEvents=5] - Minimum telemetry entries required to run evolution.
 * @param {number} [options.N=500] - Trial count for candidate simulations.
 * @returns {Promise<Object>} The evolution execution summary.
 */
export async function evolvePlaybookCycle(options = {}) {
  const minEvents = options.minEvents ?? 5;
  const N = options.N ?? 500;

  try {
    // 1. Load active playbook
    const currentPlaybook = await loadCurrentPlaybook();

    // 2. Fetch telemetry
    const windowEvents = await getRollingWindow();
    
    if (windowEvents.length < minEvents) {
      return {
        evolved: false,
        reason: `Insufficient telemetry samples (${windowEvents.length}/${minEvents} required).`,
        currentPlaybook
      };
    }

    // 3. Generate feature vectors
    const featureVectors = generateFeatureVectors(windowEvents);

    // 4. Run Pattern Analysis
    const patterns = analyzePatterns(featureVectors);

    // 5. Generate Candidate Mutations
    const candidates = generateCandidates(currentPlaybook, patterns);

    if (candidates.length === 0) {
      return {
        evolved: false,
        reason: 'No mutations could be generated from active patterns.',
        currentPlaybook
      };
    }

    // 6. Simulate Candidates
    const simulatedCandidates = [];
    for (const cand of candidates) {
      const simResult = await simulateCandidate(cand, windowEvents, currentPlaybook, N);
      simulatedCandidates.push(simResult);
    }

    // 7. Evaluate and Promote winning configurations
    const promotionResult = await evaluateAndPromote(currentPlaybook, simulatedCandidates, candidates);

    return {
      evolved: promotionResult.promoted,
      promotionResult,
      patterns,
      candidatesCount: candidates.length,
      simulations: simulatedCandidates
    };
  } catch (error) {
    console.error(`[PlaybookEvolutionEngine] Evolution cycle failed: ${error.message}`);
    return {
      evolved: false,
      error: error.message
    };
  }
}

export {
  getRollingWindow,
  addTelemetryEvent,
  resetTelemetryWindow,
  generateFeatureVectors,
  analyzePatterns,
  generateCandidates,
  simulateCandidate,
  evaluateAndPromote,
  promotePlaybook,
  rollbackPlaybook,
  loadCurrentPlaybook,
  getPlaybookHistory,
  isGovernanceLocked,
  freezeEvolution,
  unfreezeEvolution
};

export default {
  evolvePlaybookCycle,
  getRollingWindow,
  addTelemetryEvent,
  resetTelemetryWindow,
  generateFeatureVectors,
  analyzePatterns,
  generateCandidates,
  simulateCandidate,
  evaluateAndPromote,
  promotePlaybook,
  rollbackPlaybook,
  loadCurrentPlaybook,
  getPlaybookHistory,
  isGovernanceLocked,
  freezeEvolution,
  unfreezeEvolution
};
