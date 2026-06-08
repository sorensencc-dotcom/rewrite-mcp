/**
 * projects/cic/ingestion/src/pipeline/synthesize-pipeline.js
 * @version 1.0.0
 * @date 2026-06-07
 *
 * SYNTHESIZE Stage: Combine artifact signals into coherent narrative
 *
 * Input: narrativeSignals from ORCHESTRATE consumers
 * Output: Final narrative with evidence attribution
 *
 * Responsibilities:
 * 1. Merge signals from multiple extractors
 * 2. Prioritize by confidence scores
 * 3. Create evidence chains for each claim
 * 4. Attribute signals to original artifacts
 */

import { log } from '../logging/logger.js';

const MODULE = 'synthesize-pipeline';

/**
 * Synthesize narrative from artifact signals
 *
 * @param {Object} narrativeSignals — signals from ORCHESTRATE consumers
 * @param {Object} envelope — original envelope
 * @param {Array<Object>} enrichedArtifacts — all artifacts from ENRICH
 * @param {string} correlationId — pipeline correlation ID
 * @returns {Promise<Object>} — synthesized narrative
 */
export async function synthesizeNarrative(
  narrativeSignals,
  envelope,
  enrichedArtifacts,
  correlationId
) {
  log.info('synthesize_stage_start', {
    correlation_id: correlationId,
    signal_count: narrativeSignals.length,
    artifact_count: enrichedArtifacts.length,
  });

  const narrative = {
    id: `narrative-${correlationId}`,
    source_asset: envelope.id,
    timestamp: new Date().toISOString(),
    claims: [],
    evidence: {},
    signal_summary: {},
    confidence_factors: {},
  };

  // 1. Organize signals by type
  const signalsByType = {};
  for (const signal of narrativeSignals) {
    const type = signal.signal_type;
    if (!signalsByType[type]) {
      signalsByType[type] = [];
    }
    signalsByType[type].push(signal);
  }

  narrative.signal_summary = Object.keys(signalsByType).reduce(
    (acc, type) => {
      acc[type] = signalsByType[type].length;
      return acc;
    },
    {}
  );

  // 2. Build evidence chains for reverse-image results
  if (signalsByType['reverse-image-evidence']) {
    const reverseImageSignals = signalsByType['reverse-image-evidence'];
    const reverseImageArtifact = enrichedArtifacts.find(
      (a) => a.payload?.kind === 'reverse-image-results'
    );

    if (reverseImageArtifact) {
      const confidence = reverseImageArtifact.payload.searchConfidence;
      const results = reverseImageArtifact.payload.results || [];

      narrative.claims.push({
        type: 'image-identification',
        statement: `Image matches ${results.length} known sources`,
        confidence,
        evidence_ids: ['evidence-reverse-image-1'],
      });

      narrative.evidence['evidence-reverse-image-1'] = {
        type: 'reverse-image-search',
        timestamp: reverseImageArtifact.meta.createdAt,
        extractor: reverseImageArtifact.meta.extractor.name,
        results: results.map((r, i) => ({
          rank: i + 1,
          title: r.title,
          url: r.url,
          confidence: r.confidence,
          source: r.source,
        })),
        total_matches: reverseImageArtifact.payload.totalMatches,
      };

      narrative.confidence_factors['reverse-image'] = {
        signal_confidence: confidence,
        result_count: results.length,
        source_diversity: new Set(results.map((r) => r.source)).size,
        weight: 0.15, // Phase 7.7 weight
      };
    }
  }

  // 3. Build evidence chains for scene context
  if (signalsByType['scene-context']) {
    const sceneArtifact = enrichedArtifacts.find((a) => a.payload?.kind === 'scene');

    if (sceneArtifact) {
      const labels = sceneArtifact.payload.labels || [];

      narrative.claims.push({
        type: 'scene-classification',
        statement: `Scene contains: ${labels.map((l) => l.name).join(', ')}`,
        confidence: Math.max(...labels.map((l) => l.confidence), 0),
        evidence_ids: ['evidence-scene-1'],
      });

      narrative.evidence['evidence-scene-1'] = {
        type: 'scene-detection',
        timestamp: sceneArtifact.meta.createdAt,
        extractor: sceneArtifact.meta.extractor.name,
        labels: labels.map((l, i) => ({
          rank: i + 1,
          name: l.name,
          confidence: l.confidence,
        })),
      };

      narrative.confidence_factors['scene'] = {
        label_confidence: Math.max(...labels.map((l) => l.confidence), 0),
        label_count: labels.length,
        weight: 0.10, // Phase 7.7 weight
      };
    }
  }

  // 4. Calculate aggregate confidence from Phase 7.7 model
  const aggregateConfidence = _calculateAggregateConfidence(
    narrative.confidence_factors
  );
  narrative.overall_confidence = aggregateConfidence;

  log.info('synthesize_stage_complete', {
    correlation_id: correlationId,
    claim_count: narrative.claims.length,
    evidence_count: Object.keys(narrative.evidence).length,
    overall_confidence: aggregateConfidence,
  });

  return narrative;
}

/**
 * Calculate aggregate confidence using Phase 7.7 weighted model
 *
 * @param {Object} confidenceFactors — confidence by signal type
 * @returns {number} — aggregate confidence [0.0, 1.0]
 */
function _calculateAggregateConfidence(confidenceFactors) {
  // Phase 7.7: Deterministic weighted confidence scorer
  // Combines multiple signal confidences using predefined weights

  let aggregateScore = 0;
  let totalWeight = 0;

  for (const [signal, factor] of Object.entries(confidenceFactors)) {
    const weight = factor.weight || 0.1;
    const confidence = factor.signal_confidence || 0;

    aggregateScore += confidence * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.min(1.0, aggregateScore / totalWeight) : 0.5;
}

/**
 * Build narrative with drift signals (Phase 7.8 integration)
 *
 * @param {Object} narrative — synthesized narrative
 * @param {Object} previousNarrative — previous narrative for drift comparison
 * @returns {Object} — narrative with drift vector
 */
export function addDriftSignals(narrative, previousNarrative) {
  // Phase 7.8: Drift Calculator
  // Measures changes across semantic, temporal, narrative, and causal dimensions

  if (!previousNarrative) {
    narrative.drift_vector = {
      semantic_drift: 0,
      temporal_drift: 0,
      narrative_drift: 0,
      causal_drift: 0,
      overall_drift: 0,
    };
    return narrative;
  }

  // Calculate drift components
  const confidenceDelta =
    narrative.overall_confidence - (previousNarrative.overall_confidence || 0.5);
  const claimDelta = narrative.claims.length - previousNarrative.claims.length;

  narrative.drift_vector = {
    semantic_drift: Math.abs(confidenceDelta) * 0.25, // Confidence change
    temporal_drift: new Date(narrative.timestamp) - new Date(previousNarrative.timestamp) > 86400000 ? 0.1 : 0, // Day+ old
    narrative_drift: Math.abs(claimDelta) * 0.15, // Claim count change
    causal_drift: _calculateCausalDrift(narrative.evidence, previousNarrative.evidence) * 0.5,
    overall_drift: 0, // Computed below
  };

  const driftComponents = Object.entries(narrative.drift_vector)
    .filter(([k]) => k !== 'overall_drift')
    .map(([, v]) => v);

  narrative.drift_vector.overall_drift = driftComponents.length > 0
    ? driftComponents.reduce((a, b) => a + b) / driftComponents.length
    : 0;

  return narrative;
}

/**
 * Calculate causal drift (evidence source changes)
 *
 * @param {Object} currentEvidence — current narrative evidence
 * @param {Object} previousEvidence — previous narrative evidence
 * @returns {number} — drift score [0.0, 1.0]
 */
function _calculateCausalDrift(currentEvidence, previousEvidence) {
  if (!previousEvidence) return 0;

  const currentSources = new Set(
    Object.values(currentEvidence).map((e) => e.type)
  );
  const previousSources = new Set(
    Object.values(previousEvidence).map((e) => e.type)
  );

  const commonSources = new Set([...currentSources].filter((s) => previousSources.has(s)));
  const allSources = new Set([...currentSources, ...previousSources]);

  // Jaccard similarity: intersection / union
  return 1 - commonSources.size / allSources.size;
}
