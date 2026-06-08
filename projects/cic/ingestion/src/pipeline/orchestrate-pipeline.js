/**
 * projects/cic/ingestion/src/pipeline/orchestrate-pipeline.js
 * @version 1.0.0
 * @date 2026-06-07
 *
 * ORCHESTRATE Stage: Route extracted artifacts to downstream consumers
 *
 * Input: enrichedArtifacts from ENRICH stage
 * Output: Routed artifacts with consumer assignments
 *
 * Responsibilities:
 * 1. Classify each artifact by kind (reverse-image-results, scene, objects, etc.)
 * 2. Route to appropriate consumer (trust scorer, policy validator, synthesizer)
 * 3. Group by consumer for batch processing
 * 4. Emit routing decision events
 */

import { log } from '../logging/logger.js';

const MODULE = 'orchestrate-pipeline';

/**
 * Artifact routing destinations
 */
export const ROUTING_DESTINATIONS = {
  TRUST_SCORER: 'trust-scorer',
  POLICY_VALIDATOR: 'policy-validator',
  NARRATIVE_SYNTHESIZER: 'narrative-synthesizer',
  AUDIT_LOGGER: 'audit-logger',
  ARCHIVE: 'archive-cold-storage',
};

/**
 * Routing rules: kind → [destinations]
 */
const ROUTING_RULES = {
  'reverse-image-results': [
    ROUTING_DESTINATIONS.TRUST_SCORER,
    ROUTING_DESTINATIONS.POLICY_VALIDATOR,
    ROUTING_DESTINATIONS.NARRATIVE_SYNTHESIZER,
    ROUTING_DESTINATIONS.AUDIT_LOGGER,
  ],
  scene: [
    ROUTING_DESTINATIONS.NARRATIVE_SYNTHESIZER,
    ROUTING_DESTINATIONS.TRUST_SCORER,
    ROUTING_DESTINATIONS.AUDIT_LOGGER,
  ],
  objects: [
    ROUTING_DESTINATIONS.TRUST_SCORER,
    ROUTING_DESTINATIONS.NARRATIVE_SYNTHESIZER,
    ROUTING_DESTINATIONS.AUDIT_LOGGER,
  ],
  faces: [
    ROUTING_DESTINATIONS.POLICY_VALIDATOR,
    ROUTING_DESTINATIONS.TRUST_SCORER,
    ROUTING_DESTINATIONS.AUDIT_LOGGER,
  ],
  embedding: [
    ROUTING_DESTINATIONS.ARCHIVE,
    ROUTING_DESTINATIONS.AUDIT_LOGGER,
  ],
};

/**
 * @typedef {Object} RoutedArtifact
 * @property {string} kind — artifact kind (reverse-image-results, scene, etc.)
 * @property {Object} artifact — original artifact object
 * @property {string[]} destinations — routing destinations
 * @property {string} assetId — original asset ID
 * @property {string} region — region from metadata
 * @property {string} timestamp — routing timestamp
 */

/**
 * Route artifacts from ENRICH to appropriate downstream consumers
 *
 * @param {Array<Object>} enrichedArtifacts — artifacts from ENRICH stage
 * @param {string} correlationId — pipeline correlation ID
 * @returns {Promise<Object>} — { routed: RoutedArtifact[], routing_stats: Object }
 */
export async function orchestrateArtifacts(enrichedArtifacts, correlationId) {
  log.info('orchestrate_stage_start', {
    correlation_id: correlationId,
    artifact_count: enrichedArtifacts.length,
  });

  const routed = [];
  const stats = {
    total_artifacts: enrichedArtifacts.length,
    routed_count: 0,
    unrouted_count: 0,
    destinations_used: new Set(),
    kind_distribution: {},
  };

  for (const artifact of enrichedArtifacts) {
    const kind = artifact.payload?.kind;

    if (!kind) {
      log.warn('orchestrate_unroutable_artifact', {
        correlation_id: correlationId,
        reason: 'missing_kind',
        artifact_type: artifact.type,
      });
      stats.unrouted_count++;
      continue;
    }

    const destinations = ROUTING_RULES[kind] || [ROUTING_DESTINATIONS.AUDIT_LOGGER];
    stats.destinations_used = new Set([...stats.destinations_used, ...destinations]);
    stats.kind_distribution[kind] = (stats.kind_distribution[kind] || 0) + 1;

    routed.push({
      kind,
      artifact,
      destinations,
      assetId: artifact.meta?.extractor?.name || 'unknown',
      region: artifact.meta?.region || 'unknown',
      timestamp: new Date().toISOString(),
    });

    stats.routed_count++;
  }

  log.info('orchestrate_stage_complete', {
    correlation_id: correlationId,
    routed_count: stats.routed_count,
    unrouted_count: stats.unrouted_count,
    destinations: Array.from(stats.destinations_used),
  });

  return {
    routed,
    routing_stats: {
      ...stats,
      destinations_used: Array.from(stats.destinations_used),
    },
  };
}

/**
 * Group routed artifacts by destination for batch processing
 *
 * @param {Array<RoutedArtifact>} routed — routed artifacts
 * @returns {Object} — { [destination]: RoutedArtifact[] }
 */
export function groupArtifactsByDestination(routed) {
  const grouped = {};

  for (const routedArtifact of routed) {
    for (const destination of routedArtifact.destinations) {
      if (!grouped[destination]) {
        grouped[destination] = [];
      }
      grouped[destination].push(routedArtifact);
    }
  }

  return grouped;
}

/**
 * Trust Scorer consumer: Evaluate confidence signals from reverse-image-results
 *
 * @param {Array<RoutedArtifact>} reverseImageArtifacts — routed reverse-image-results
 * @returns {Promise<Array>} — trust scores
 */
export async function consumeForTrustScoring(reverseImageArtifacts) {
  log.info('trust_scorer_consume', {
    artifact_count: reverseImageArtifacts.length,
  });

  const trustScores = reverseImageArtifacts.map((routed) => ({
    assetId: routed.assetId,
    signal: 'reverse-image',
    confidence: routed.artifact.payload?.searchConfidence || 0.0,
    resultCount: routed.artifact.payload?.results?.length || 0,
    sources: routed.artifact.payload?.results?.map((r) => r.source) || [],
    weight: 0.15, // Phase 7.7: weight for multi-signal confidence model
  }));

  return trustScores;
}

/**
 * Policy Validator consumer: Check for policy violations (e.g., sensitive images)
 *
 * @param {Array<RoutedArtifact>} artifacts — routed artifacts
 * @returns {Promise<Array>} — policy violations (if any)
 */
export async function consumeForPolicyValidation(artifacts) {
  log.info('policy_validator_consume', {
    artifact_count: artifacts.length,
  });

  const violations = [];

  for (const routed of artifacts) {
    const kind = routed.kind;

    // Example: Faces + High Confidence = Privacy concern
    if (kind === 'faces' && routed.artifact.payload?.faces?.length > 0) {
      violations.push({
        assetId: routed.assetId,
        violation_type: 'privacy',
        severity: 'medium',
        reason: 'face detection requires privacy review',
      });
    }

    // Example: Reverse-image + Low confidence = Uncertain origin
    if (kind === 'reverse-image-results' && routed.artifact.payload?.searchConfidence < 0.3) {
      violations.push({
        assetId: routed.assetId,
        violation_type: 'uncertain_origin',
        severity: 'low',
        reason: 'reverse image confidence below threshold',
      });
    }
  }

  return violations;
}

/**
 * Narrative Synthesizer consumer: Incorporate artifact signals into narrative
 *
 * @param {Array<RoutedArtifact>} artifacts — routed artifacts
 * @param {Object} envelope — original envelope
 * @returns {Promise<Object>} — narrative signals
 */
export async function consumeForNarrativeSynthesis(artifacts, envelope) {
  log.info('narrative_synthesizer_consume', {
    artifact_count: artifacts.length,
  });

  const narrativeSignals = [];

  for (const routed of artifacts) {
    const kind = routed.kind;

    if (kind === 'reverse-image-results') {
      const payload = routed.artifact.payload;
      narrativeSignals.push({
        signal_type: 'reverse-image-evidence',
        confidence: payload.searchConfidence,
        top_result: payload.results?.[0],
        narrative_hint: `Image identified with ${Math.round(payload.searchConfidence * 100)}% confidence as: ${payload.results?.[0]?.title || 'unknown'}`,
      });
    }

    if (kind === 'scene') {
      const payload = routed.artifact.payload;
      narrativeSignals.push({
        signal_type: 'scene-context',
        labels: payload.labels?.slice(0, 3),
        narrative_hint: `Scene classified as: ${payload.labels
          ?.map((l) => l.name)
          .join(', ') || 'unknown'}`,
      });
    }
  }

  return narrativeSignals;
}
