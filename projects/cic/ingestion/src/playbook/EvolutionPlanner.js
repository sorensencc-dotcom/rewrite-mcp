// File: projects/cic/ingestion/src/playbook/EvolutionPlanner.js | Date: 2026-05-31 | v1.0.0

import crypto from 'node:crypto';

/**
 * Proposes mutated candidate playbooks based on active pattern analysis reports.
 * 
 * @param {Object} currentPlaybook - The active playbook definition.
 * @param {Object} patterns - The PatternAnalyzer analysis results.
 * @returns {Array<Object>} List of candidate mutations: Array<{ id, mutation, playbook }>
 */
export function generateCandidates(currentPlaybook, patterns = {}) {
  const candidates = [];
  const { bottlenecks = [], parallelCandidates = [], skipCandidates = [] } = patterns;

  // Clone utility
  const clone = (obj) => JSON.parse(JSON.stringify(obj));

  // 1. Mutation Option A: Parallelize independent serial stages
  if (parallelCandidates.length > 0) {
    const candidateA = clone(currentPlaybook);
    candidateA.version = `pb-cand-parallel-${Date.now()}`;
    
    const targets = parallelCandidates[0]; // e.g. ['TopicExtractor', 'SemanticExtractor']
    candidateA.stages = candidateA.stages.map(stage => {
      if (targets.includes(stage.name)) {
        return { ...stage, mode: 'parallel' };
      }
      return stage;
    });

    candidates.push({
      id: `pb-cand-${crypto.randomUUID().slice(0, 8)}`,
      mutation: `parallelize-${targets.join('-').toLowerCase()}`,
      playbook: candidateA
    });
  }

  // 2. Mutation Option B: Add conditional routing rules to heavy bottlenecks
  if (skipCandidates.length > 0) {
    const candidateB = clone(currentPlaybook);
    candidateB.version = `pb-cand-conditional-${Date.now()}`;

    for (const skip of skipCandidates) {
      candidateB.stages = candidateB.stages.map(stage => {
        if (stage.name === skip.extractor) {
          return {
            ...stage,
            mode: 'conditional',
            requires: [skip.rule.split(' when ')[1] || 'semantic.confidence > 0.85']
          };
        }
        return stage;
      });
    }

    candidates.push({
      id: `pb-cand-${crypto.randomUUID().slice(0, 8)}`,
      mutation: `conditionalize-${skipCandidates.map(s => s.extractor.toLowerCase()).join('-')}`,
      playbook: candidateB
    });
  }

  // 3. Mutation Option C: Reorder stages (e.g. moving light/highly accurate stages up)
  // Let's swap the first two stages if they are serial/parallel
  if (currentPlaybook.stages && currentPlaybook.stages.length >= 2) {
    const candidateC = clone(currentPlaybook);
    candidateC.version = `pb-cand-reorder-${Date.now()}`;
    
    // Swap index 0 and index 1
    const temp = candidateC.stages[0];
    candidateC.stages[0] = candidateC.stages[1];
    candidateC.stages[1] = temp;

    candidates.push({
      id: `pb-cand-${crypto.randomUUID().slice(0, 8)}`,
      mutation: 'reorder-stages-swap-first-two',
      playbook: candidateC
    });
  }

  // Fallback: If no mutations are possible, return a minor weight adjustment candidate
  if (candidates.length === 0) {
    const fallback = clone(currentPlaybook);
    fallback.version = `pb-cand-weight-${Date.now()}`;
    if (fallback.stages && fallback.stages[0]) {
      fallback.stages[0].weight = Math.round(((fallback.stages[0].weight || 0.9) + 0.05) * 100) / 100;
    }
    candidates.push({
      id: `pb-cand-${crypto.randomUUID().slice(0, 8)}`,
      mutation: 'minor-weight-adjustment',
      playbook: fallback
    });
  }

  return candidates;
}

export default {
  generateCandidates
};
