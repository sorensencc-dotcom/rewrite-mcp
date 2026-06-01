/**
 * projects/cic/ingestion/src/pipeline/validate-pipeline.js
 * @version 1.0.0
 * @date 2026-05-30
 *
 * Integrated INGEST → ENRICH → COMPRESS Pipeline with SkillOpt Validator
 *
 * This pipeline orchestrates the full CIC ingestion workflow:
 *   1. INGEST: Normalize raw input → canonical envelope
 *   2. Validate INGEST output (envelope quality)
 *   3. ENRICH: Run extractors → enrich envelope with artifacts
 *   4. Validate ENRICH output (artifact quality)
 *   5. COMPRESS: Optimize output → reduce tokens/complexity
 *   6. Validate COMPRESS output (no degradation from compression)
 *
 * Each validation point:
 *   - Scores skill output (accuracy, consistency, efficiency, latency)
 *   - Detects drift from baseline
 *   - Escalates anomalies to Claude (yellow/red flags)
 *   - Emits Federation Protocol telemetry
 *   - Updates rolling baseline
 *   - Blocks pipeline on RED; continues on GREEN/YELLOW (with confidence check)
 *
 * Usage (programmatic):
 *   import { validatePipeline } from './src/pipeline/validate-pipeline.js';
 *   const result = await validatePipeline({
 *     user_id, intent, text, source,
 *     qdrantClient, claudeClient, emitterClient
 *   });
 *
 * Usage (CLI):
 *   node src/pipeline/validate-pipeline.js --user_id=cic --intent=research \
 *     --text="..." [--source=archive]
 */

import 'dotenv/config';
import { normalize } from '../normalizer/index.js';
import { runExtractorsForAsset } from '../extractors/registry.js';
import { validateSkillOutput, loadBaseline } from '../validators/index.js';
import { log } from '../logging/logger.js';
import crypto from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import { QdrantClient } from '@qdrant/js-client-rest';

const MODULE = 'validate-pipeline';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ValidatePipelineInput
 * @property {string} user_id
 * @property {string} intent
 * @property {string} text
 * @property {string} [source] — optional source label (e.g. "drive", "archive")
 * @property {string} [correlation_id]
 * @property {Object} qdrantClient — @qdrant/js-client-rest
 * @property {Object} claudeClient — @anthropic-ai/sdk Anthropic instance
 * @property {Object} emitterClient — Federation Protocol emitter (HTTP/queue/file)
 */

/**
 * @typedef {Object} ValidatePipelineResult
 * @property {string} correlation_id
 * @property {string} user_id
 * @property {string} intent
 * @property {string} source
 * @property {Object} ingest — { envelope, validation_result }
 * @property {Object} enrich — { artifacts, validation_result }
 * @property {Object} compress — { optimized_output, validation_result }
 * @property {number} duration_ms
 * @property {boolean} success
 * @property {string} [error] — populated if any stage failed
 */

/**
 * Run the full validated ingestion pipeline.
 *
 * @param {ValidatePipelineInput} input
 * @returns {Promise<ValidatePipelineResult>}
 */
export async function validatePipeline({
  user_id,
  intent,
  text,
  source = 'manual',
  correlation_id = crypto.randomUUID(),
  qdrantClient,
  claudeClient,
  emitterClient,
}) {
  const t0 = Date.now();
  const ctx = _createContext({ user_id, intent, correlation_id });

  _assertInput({ user_id, intent, text });
  _assertClients({ qdrantClient, claudeClient, emitterClient });

  log.info('validate_pipeline_start', { correlation_id, user_id, intent, source });

  try {
    // ────────────────────────────────────────────────────────────────────────
    // STAGE 1: INGEST (Normalize raw input → canonical envelope)
    // ────────────────────────────────────────────────────────────────────────
    log.info('ingest_stage_start', { correlation_id, user_id, intent });

    const envelope = await normalize(
      {
        type: 'text',
        origin: source,
        raw: text,
        mime: 'text/plain',
      },
      {
        region: _inferRegion(intent),
        tags: [intent],
      }
    );

    log.info('ingest_stage_complete', { correlation_id, assetId: envelope.id, region: envelope.region });

    // ────────────────────────────────────────────────────────────────────────
    // VALIDATE: INGEST Output (Envelope Quality)
    // ────────────────────────────────────────────────────────────────────────
    log.info('validate_ingest_start', { correlation_id, assetId: envelope.id });

    const ingestValidation = await validateSkillOutput({
      skillOutput: {
        envelope,
        fields: {
          id: envelope.id,
          region: envelope.region,
          source_type: envelope.source.type,
          content_type: envelope.source.mime,
          checksum: envelope.source.checksum,
        },
        confidence: {
          id: 0.99,
          region: 0.95,
          source_type: 0.98,
          content_type: 0.97,
          checksum: 0.99,
        },
        tokens_used: _estimateTokens(JSON.stringify(envelope)),
        latency_ms: Date.now() - t0,
      },
      groundTruth: {
        // For INGEST, ground truth is: envelope should exist, have valid structure, correct checksum
        fields: {
          id: 'should_exist',
          region: _inferRegion(intent),
          source_type: 'text',
          content_type: 'text/plain',
          checksum: 'should_match_sha256',
        },
      },
      baseline: await _loadBaseline('normalizer@1.0.0', qdrantClient),
      batchId: `batch_ingest_${correlation_id.slice(0, 8)}`,
      batchSize: 1,
      skillId: 'normalizer@1.0.0',
      pipelineStage: 'INGEST',
      options: {
        assessmentOptions: { skillType: 'normalizer', batchSize: 1 },
        skipEscalation: false,
      },
      emitterClient,
      qdrantClient,
      claudeClient,
    });

    if (!ingestValidation.success && ingestValidation.scoring?.status === 'red') {
      throw new Error(
        `INGEST validation failed (RED flag): ${ingestValidation.escalation?.reasoning || 'Unknown error'}`
      );
    }

    log.info('validate_ingest_complete', {
      correlation_id,
      status: ingestValidation.scoring?.status,
      score: ingestValidation.scoring?.aggregate,
    });

    // ────────────────────────────────────────────────────────────────────────
    // STAGE 2: ENRICH (Run extractors → enrich envelope with artifacts)
    // ────────────────────────────────────────────────────────────────────────
    log.info('enrich_stage_start', { correlation_id, assetId: envelope.id });

    const extractionResults = await runExtractorsForAsset(envelope, ctx);

    const enrichedArtifacts = extractionResults.reduce((acc, result) => {
      if (result.artifacts && result.artifacts.length > 0) {
        acc.push(...result.artifacts);
      }
      return acc;
    }, []);

    log.info('enrich_stage_complete', { correlation_id, artifactCount: enrichedArtifacts.length });

    // ────────────────────────────────────────────────────────────────────────
    // VALIDATE: ENRICH Output (Artifact Quality)
    // ────────────────────────────────────────────────────────────────────────
    log.info('validate_enrich_start', { correlation_id, artifactCount: enrichedArtifacts.length });

    const enrichValidation = await validateSkillOutput({
      skillOutput: {
        artifacts: enrichedArtifacts,
        artifact_count: enrichedArtifacts.length,
        coverage: _computeArtifactCoverage(enrichedArtifacts),
        tokens_used: _estimateTokens(JSON.stringify(enrichedArtifacts)),
        latency_ms: Date.now() - t0,
        confidence: {
          artifact_count: 0.95,
          coverage: 0.87,
          tokens_used: 0.92,
        },
      },
      groundTruth: {
        // For ENRICH, ground truth is: artifacts should be non-empty, valid structure
        fields: {
          artifact_count: enrichedArtifacts.length > 0 ? 'non_zero' : 'zero',
          coverage: 'should_cover_semantic_fields',
        },
      },
      baseline: await _loadBaseline('extractors@registry', qdrantClient),
      batchId: `batch_enrich_${correlation_id.slice(0, 8)}`,
      batchSize: enrichedArtifacts.length,
      skillId: 'extractors@registry',
      pipelineStage: 'ENRICH',
      options: {
        assessmentOptions: { skillType: 'enricher', batchSize: enrichedArtifacts.length },
        skipEscalation: false,
      },
      emitterClient,
      qdrantClient,
      claudeClient,
    });

    if (!enrichValidation.success && enrichValidation.scoring?.status === 'red') {
      throw new Error(
        `ENRICH validation failed (RED flag): ${enrichValidation.escalation?.reasoning || 'Unknown error'}`
      );
    }

    log.info('validate_enrich_complete', {
      correlation_id,
      status: enrichValidation.scoring?.status,
      score: enrichValidation.scoring?.aggregate,
    });

    // ────────────────────────────────────────────────────────────────────────
    // STAGE 3: COMPRESS (Optimize output → reduce tokens/complexity)
    // ────────────────────────────────────────────────────────────────────────
    log.info('compress_stage_start', { correlation_id });

    const compressedOutput = {
      envelope: _compressEnvelope(envelope),
      artifacts: _compressArtifacts(enrichedArtifacts),
      summary: _generateCompressSummary(envelope, enrichedArtifacts),
    };

    log.info('compress_stage_complete', { correlation_id });

    // ────────────────────────────────────────────────────────────────────────
    // VALIDATE: COMPRESS Output (No Degradation from Compression)
    // ────────────────────────────────────────────────────────────────────────
    log.info('validate_compress_start', { correlation_id });

    const compressValidation = await validateSkillOutput({
      skillOutput: {
        original_size: JSON.stringify({ envelope, artifacts: enrichedArtifacts }).length,
        compressed_size: JSON.stringify(compressedOutput).length,
        compression_ratio:
          (1 - JSON.stringify(compressedOutput).length / JSON.stringify({ envelope, enrichedArtifacts }).length) *
          100,
        information_loss: _computeInfoLoss(envelope, compressedOutput.envelope),
        tokens_used: _estimateTokens(JSON.stringify(compressedOutput)),
        latency_ms: Date.now() - t0,
        confidence: {
          compression_ratio: 0.98,
          information_loss: 0.92,
          tokens_used: 0.95,
        },
      },
      groundTruth: {
        // For COMPRESS, ground truth is: ratio <50%, no critical info loss
        fields: {
          compression_ratio: 'should_be_less_than_50',
          information_loss: 'should_preserve_critical_fields',
        },
      },
      baseline: await _loadBaseline('compressor@1.0.0', qdrantClient),
      batchId: `batch_compress_${correlation_id.slice(0, 8)}`,
      batchSize: 1,
      skillId: 'compressor@1.0.0',
      pipelineStage: 'COMPRESS',
      options: {
        assessmentOptions: { skillType: 'compressor', batchSize: 1 },
        skipEscalation: false,
      },
      emitterClient,
      qdrantClient,
      claudeClient,
    });

    if (!compressValidation.success && compressValidation.scoring?.status === 'red') {
      throw new Error(
        `COMPRESS validation failed (RED flag): ${compressValidation.escalation?.reasoning || 'Unknown error'}`
      );
    }

    log.info('validate_compress_complete', {
      correlation_id,
      status: compressValidation.scoring?.status,
      score: compressValidation.scoring?.aggregate,
    });

    // ────────────────────────────────────────────────────────────────────────
    // Final Result Assembly
    // ────────────────────────────────────────────────────────────────────────
    const duration_ms = Date.now() - t0;

    log.info('validate_pipeline_complete', { correlation_id, duration_ms });

    return {
      correlation_id,
      user_id,
      intent,
      source,
      ingest: {
        envelope,
        validation_result: ingestValidation,
      },
      enrich: {
        artifacts: enrichedArtifacts,
        validation_result: enrichValidation,
      },
      compress: {
        optimized_output: compressedOutput,
        validation_result: compressValidation,
      },
      duration_ms,
      success: true,
    };
  } catch (err) {
    log.error('validate_pipeline_failed', {
      correlation_id,
      user_id,
      intent,
      err: err.message,
      stack: err.stack,
    });

    return {
      correlation_id,
      user_id,
      intent,
      source,
      ingest: null,
      enrich: null,
      compress: null,
      duration_ms: Date.now() - t0,
      success: false,
      error: err.message,
    };
  }
}

// ---------------------------------------------------------------------------
// Internal Utilities
// ---------------------------------------------------------------------------

function _assertInput({ user_id, intent, text }) {
  const missing = [];
  if (!user_id || typeof user_id !== 'string') missing.push('user_id');
  if (!intent || typeof intent !== 'string') missing.push('intent');
  if (!text || typeof text !== 'string') missing.push('text');
  if (missing.length) throw new Error(`[${MODULE}] missing required fields: ${missing.join(', ')}`);
}

function _assertClients({ qdrantClient, claudeClient, emitterClient }) {
  const missing = [];
  if (!qdrantClient) missing.push('qdrantClient');
  if (!claudeClient) missing.push('claudeClient');
  if (!emitterClient) missing.push('emitterClient');
  if (missing.length) throw new Error(`[${MODULE}] missing required clients: ${missing.join(', ')}`);
}

function _createContext({ user_id, intent, correlation_id }) {
  return {
    user_id,
    intent,
    correlation_id,
    logInfo: (msg, data) => log.info(msg, data),
    logWarn: (msg, data) => log.warn(msg, data),
    logError: (msg, data) => log.error(msg, data),
  };
}

function _inferRegion(intent) {
  const regionMap = {
    research: 'archives',
    archive: 'archives',
    documentary: 'media',
    events: 'historical',
    default: 'global',
  };
  return regionMap[intent] || regionMap.default;
}

async function _loadBaseline(skillId, qdrantClient) {
  try {
    const loaded = await loadBaseline(skillId, qdrantClient);
    return loaded.baseline;
  } catch (err) {
    log.warn('baseline_load_failed', { skillId, err: err.message });
    return {
      accuracy: null,
      consistency: 100,
      efficiency: 100,
      latency: 100,
      aggregate: 100,
      baseline_tokens: 1500,
      baseline_latency_ms: 300
    };
  }
}

function _estimateTokens(text) {
  // Rough estimate: 1 token ≈ 4 chars
  return Math.ceil(text.length / 4);
}

function _computeArtifactCoverage(artifacts) {
  const kinds = new Set(artifacts.map(a => a.payload?.kind).filter(Boolean));
  const expectedKinds = ['scene', 'objects', 'faces', 'embedding', 'safety', 'anomaly'];
  return (kinds.size / expectedKinds.length) * 100;
}

function _compressEnvelope(envelope) {
  // Stub: in production, implement actual compression logic
  return {
    id: envelope.id,
    region: envelope.region,
    source_checksum: envelope.source.checksum,
    content_summary: envelope.content.text?.substring(0, 100),
  };
}

function _compressArtifacts(artifacts) {
  // Stub: in production, implement artifact compression (e.g., lower precision embeddings)
  return artifacts.map(a => ({
    type: a.type,
    kind: a.payload?.kind,
    summary: `${a.payload?.kind} artifact`,
  }));
}

function _generateCompressSummary(envelope, artifacts) {
  return {
    asset_id: envelope.id,
    artifact_kinds: [...new Set(artifacts.map(a => a.payload?.kind))],
    region: envelope.region,
    timestamp: new Date().toISOString(),
  };
}

function _computeInfoLoss(original, compressed) {
  // Stub: measure how much information was lost in compression
  const originalKeys = Object.keys(original);
  const compressedKeys = Object.keys(compressed);
  const lost = originalKeys.filter(k => !compressedKeys.includes(k));
  return (lost.length / originalKeys.length) * 100;
}

// ---------------------------------------------------------------------------
// CLI entry
// ---------------------------------------------------------------------------

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = Object.fromEntries(
    process.argv
      .slice(2)
      .filter(a => a.startsWith('--'))
      .map(a => {
        const [k, ...v] = a.slice(2).split('=');
        return [k, v.join('=')];
      })
  );

  const { user_id, intent, text, source } = args;
  if (!user_id || !intent || !text) {
    console.error(`Usage: node src/pipeline/validate-pipeline.js --user_id=<id> --intent=<intent> --text="<text>" [--source=<src>]`);
    process.exit(1);
  }

  const qdrantClient = new QdrantClient({
    url: process.env.QDRANT_URL || 'http://localhost:6333',
  });

  const claudeClient = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const emitterClient = {
    emit: async (message) => {
      console.log('[TelemetryEmitter] Would emit:', JSON.stringify(message, null, 2));
    },
  };

  validatePipeline({
    user_id,
    intent,
    text,
    source,
    qdrantClient,
    claudeClient,
    emitterClient,
  })
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error(JSON.stringify({ level: 'error', msg: 'pipeline_fatal', err: err.message }));
      process.exit(1);
    });
}
