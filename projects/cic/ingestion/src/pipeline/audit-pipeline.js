/**
 * projects/cic/ingestion/src/pipeline/audit-pipeline.js
 * @version 1.0.0
 * @date 2026-06-07
 *
 * AUDIT Stage: Validate pipeline execution and track artifact provenance
 *
 * Input: Complete pipeline state (envelope, artifacts, routing, narrative)
 * Output: Audit trail with status indicators (GREEN/YELLOW/RED)
 *
 * Responsibilities:
 * 1. Validate artifact structure and content
 * 2. Track extraction provenance
 * 3. Detect anomalies
 * 4. Record audit trail for forensics
 */

import { log } from '../logging/logger.js';

const MODULE = 'audit-pipeline';

/**
 * Audit result status levels
 */
export const AUDIT_STATUS = {
  GREEN: 'green',   // All checks passed
  YELLOW: 'yellow', // Minor issues, proceed with caution
  RED: 'red',       // Critical issues, escalate
};

/**
 * Audit artifact family (from Phase E templates)
 */
export const ARTIFACT_FAMILY = {
  REVERSE_IMAGE: 'reverse-image-search',
  SCENE: 'scene-detection',
  OBJECTS: 'object-detection',
  FACES: 'face-detection',
  EMBEDDINGS: 'embeddings',
  SAFETY: 'safety-scoring',
};

/**
 * Severity levels for audit issues
 */
export const SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
};

/**
 * @typedef {Object} AuditIssue
 * @property {string} severity — INFO | WARNING | ERROR | CRITICAL
 * @property {string} code — machine-readable issue code
 * @property {string} message — human-readable message
 * @property {string} artifact_family — which extractor family
 * @property {string} [artifact_id] — specific artifact ID
 * @property {Object} [context] — additional context
 */

/**
 * Full audit of pipeline execution
 *
 * @param {Object} pipelineState — complete state { envelope, artifacts, routing, narrative }
 * @param {string} correlationId — pipeline correlation ID
 * @returns {Promise<Object>} — audit report
 */
export async function auditPipeline(pipelineState, correlationId) {
  log.info('audit_stage_start', {
    correlation_id: correlationId,
  });

  const { envelope, artifacts, routing, narrative } = pipelineState;
  const issues = [];
  const provenanceMap = new Map();

  // 1. Validate artifact structure
  _validateArtifactStructure(artifacts, issues, provenanceMap);

  // 2. Validate reverse-image-results artifacts specifically
  _validateReverseImageResults(artifacts, issues);

  // 3. Check extractor registration and versioning
  _validateExtractorVersions(artifacts, issues);

  // 4. Track provenance chain
  const provenance = _buildProvenanceChain(
    envelope,
    artifacts,
    routing,
    narrative,
    provenanceMap
  );

  // 5. Detect anomalies
  _detectAnomalies(artifacts, narrative, issues);

  // 6. Compute audit status
  const status = _computeAuditStatus(issues);

  // 7. Build audit report
  const auditReport = {
    correlation_id: correlationId,
    timestamp: new Date().toISOString(),
    status,
    artifact_count: artifacts.length,
    issue_count: issues.length,
    issue_breakdown: _countIssuesBySeverity(issues),
    issues,
    provenance,
    checks_performed: [
      'artifact_structure',
      'reverse_image_validation',
      'extractor_versions',
      'provenance_chain',
      'anomaly_detection',
    ],
  };

  log.info('audit_stage_complete', {
    correlation_id: correlationId,
    status,
    issue_count: issues.length,
  });

  return auditReport;
}

/**
 * Validate artifact structure across all artifacts
 */
function _validateArtifactStructure(artifacts, issues, provenanceMap) {
  for (let i = 0; i < artifacts.length; i++) {
    const artifact = artifacts[i];

    // Check required fields
    if (!artifact.type) {
      issues.push({
        severity: SEVERITY.ERROR,
        code: 'missing_type',
        message: `Artifact ${i} missing 'type' field`,
        artifact_family: 'unknown',
      });
    }

    if (!artifact.payload) {
      issues.push({
        severity: SEVERITY.ERROR,
        code: 'missing_payload',
        message: `Artifact ${i} missing 'payload' field`,
        artifact_family: 'unknown',
      });
      continue;
    }

    const kind = artifact.payload.kind;
    if (!kind) {
      issues.push({
        severity: SEVERITY.WARNING,
        code: 'missing_kind',
        message: `Artifact ${i} missing payload.kind`,
        artifact_family: 'unknown',
      });
    }

    // Check metadata
    if (!artifact.meta) {
      issues.push({
        severity: SEVERITY.WARNING,
        code: 'missing_meta',
        message: `Artifact ${i} missing metadata`,
        artifact_family: kind,
      });
      continue;
    }

    if (!artifact.meta.extractor) {
      issues.push({
        severity: SEVERITY.ERROR,
        code: 'missing_extractor_id',
        message: `Artifact ${i} missing extractor identification`,
        artifact_family: kind,
      });
    }

    if (!artifact.meta.createdAt) {
      issues.push({
        severity: SEVERITY.WARNING,
        code: 'missing_timestamp',
        message: `Artifact ${i} missing creation timestamp`,
        artifact_family: kind,
      });
    }

    // Track provenance
    provenanceMap.set(i, {
      artifact_id: i,
      kind,
      extractor: artifact.meta.extractor?.name,
      timestamp: artifact.meta.createdAt,
    });
  }
}

/**
 * Validate reverse-image-results artifacts
 */
function _validateReverseImageResults(artifacts, issues) {
  const reverseImageArtifacts = artifacts.filter(
    (a) => a.payload?.kind === 'reverse-image-results'
  );

  for (const artifact of reverseImageArtifacts) {
    const payload = artifact.payload;

    // Check results array
    if (!Array.isArray(payload.results)) {
      issues.push({
        severity: SEVERITY.ERROR,
        code: 'invalid_results_array',
        message: 'results must be an array',
        artifact_family: ARTIFACT_FAMILY.REVERSE_IMAGE,
      });
      continue;
    }

    // Validate each result
    for (let i = 0; i < payload.results.length; i++) {
      const result = payload.results[i];

      if (!result.url || !result.title || result.confidence === undefined || !result.source) {
        issues.push({
          severity: SEVERITY.ERROR,
          code: 'incomplete_result',
          message: `Result ${i} missing required fields (url, title, confidence, source)`,
          artifact_family: ARTIFACT_FAMILY.REVERSE_IMAGE,
          context: { result_index: i },
        });
      }

      // Validate confidence range
      if (result.confidence < 0.0 || result.confidence > 1.0) {
        issues.push({
          severity: SEVERITY.ERROR,
          code: 'invalid_confidence_range',
          message: `Result ${i} confidence ${result.confidence} outside [0.0, 1.0]`,
          artifact_family: ARTIFACT_FAMILY.REVERSE_IMAGE,
          context: { result_index: i, confidence: result.confidence },
        });
      }
    }

    // Validate searchConfidence
    if (
      payload.searchConfidence === undefined ||
      payload.searchConfidence < 0.0 ||
      payload.searchConfidence > 1.0
    ) {
      issues.push({
        severity: SEVERITY.ERROR,
        code: 'invalid_search_confidence',
        message: `searchConfidence ${payload.searchConfidence} outside [0.0, 1.0]`,
        artifact_family: ARTIFACT_FAMILY.REVERSE_IMAGE,
      });
    }

    // Verify searchConfidence is max of results
    const maxResultConfidence = Math.max(
      ...payload.results.map((r) => r.confidence),
      0
    );
    if (Math.abs(payload.searchConfidence - maxResultConfidence) > 0.001) {
      issues.push({
        severity: SEVERITY.WARNING,
        code: 'searchConfidence_mismatch',
        message: `searchConfidence ${payload.searchConfidence} !== max(results) ${maxResultConfidence}`,
        artifact_family: ARTIFACT_FAMILY.REVERSE_IMAGE,
      });
    }
  }
}

/**
 * Validate extractor versions and registration
 */
function _validateExtractorVersions(artifacts, issues) {
  const extractorVersions = new Map();

  for (const artifact of artifacts) {
    const extractor = artifact.meta?.extractor;
    if (!extractor) continue;

    const key = `${extractor.name}@${extractor.version}`;
    if (!extractorVersions.has(key)) {
      extractorVersions.set(key, 0);
    }
    extractorVersions.set(key, extractorVersions.get(key) + 1);
  }

  // Check for version consistency
  for (const [key, count] of extractorVersions) {
    const [name, version] = key.split('@');
    if (!version) {
      issues.push({
        severity: SEVERITY.WARNING,
        code: 'missing_version',
        message: `Extractor ${name} has no version`,
        artifact_family: name,
      });
    }
  }
}

/**
 * Build complete provenance chain
 */
function _buildProvenanceChain(envelope, artifacts, routing, narrative, provenanceMap) {
  return {
    asset_id: envelope.id,
    asset_region: envelope.region,
    asset_source: envelope.source.type,
    extractor_count: provenanceMap.size,
    extractors_used: Array.from(
      new Set(Array.from(provenanceMap.values()).map((p) => p.extractor))
    ),
    routing_destinations: routing?.routing_stats?.destinations_used || [],
    narrative_claims: narrative?.claims?.length || 0,
    evidence_count: Object.keys(narrative?.evidence || {}).length,
    created_at: envelope.createdAt || new Date().toISOString(),
    processed_at: new Date().toISOString(),
  };
}

/**
 * Detect anomalies in artifact distribution
 */
function _detectAnomalies(artifacts, narrative, issues) {
  // Check for empty artifact set
  if (artifacts.length === 0) {
    issues.push({
      severity: SEVERITY.WARNING,
      code: 'no_artifacts',
      message: 'Pipeline produced no artifacts',
      artifact_family: 'pipeline',
    });
  }

  // Check for confidence clustering (signal of bias)
  const confidences = artifacts
    .filter((a) => a.payload?.searchConfidence !== undefined)
    .map((a) => a.payload.searchConfidence);

  if (confidences.length > 0) {
    const mean = confidences.reduce((a, b) => a + b) / confidences.length;
    const variance = confidences.reduce((a, c) => a + Math.pow(c - mean, 2), 0) / confidences.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev < 0.1 && mean !== 0.5) {
      issues.push({
        severity: SEVERITY.YELLOW,
        code: 'confidence_clustering',
        message: `Confidence scores clustered (mean=${mean.toFixed(2)}, σ=${stdDev.toFixed(3)}) — possible bias`,
        artifact_family: 'reverse-image-search',
        context: { mean, stdDev },
      });
    }
  }

  // Check narrative for orphaned claims
  if (narrative?.claims && narrative.evidence) {
    for (const claim of narrative.claims) {
      for (const evidenceId of claim.evidence_ids || []) {
        if (!narrative.evidence[evidenceId]) {
          issues.push({
            severity: SEVERITY.ERROR,
            code: 'orphaned_evidence',
            message: `Claim references missing evidence: ${evidenceId}`,
            artifact_family: 'narrative',
          });
        }
      }
    }
  }
}

/**
 * Compute overall audit status from issues
 */
function _computeAuditStatus(issues) {
  const hasError = issues.some((i) => i.severity === SEVERITY.ERROR);
  const hasCritical = issues.some((i) => i.severity === SEVERITY.CRITICAL);

  if (hasCritical) return AUDIT_STATUS.RED;
  if (hasError) return AUDIT_STATUS.RED;
  if (issues.some((i) => i.severity === SEVERITY.WARNING)) return AUDIT_STATUS.YELLOW;
  return AUDIT_STATUS.GREEN;
}

/**
 * Count issues by severity
 */
function _countIssuesBySeverity(issues) {
  return {
    info: issues.filter((i) => i.severity === SEVERITY.INFO).length,
    warning: issues.filter((i) => i.severity === SEVERITY.WARNING).length,
    error: issues.filter((i) => i.severity === SEVERITY.ERROR).length,
    critical: issues.filter((i) => i.severity === SEVERITY.CRITICAL).length,
  };
}
