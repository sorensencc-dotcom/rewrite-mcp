/**
 * projects/cic/orchestrator/src/air/model.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * Unified Asset Intelligence Record (AIR) Model
 */

/**
 * Creates a new, empty Asset Intelligence Record.
 * 
 * @param {Object} envelope - Canonical Asset Envelope
 * @returns {Object} - Initial AIR
 */
export function createAIR(envelope) {
  return {
    assetId: envelope.id,
    region: envelope.region,

    // source & normalized context
    envelopeSummary: {
      sourceType: envelope.source.type,
      mime: envelope.source.mime,
      receivedAt: envelope.receivedAt,
      tags: envelope.tags || []
    },

    // extractor coverage
    extractors: {},

    // merged artifacts
    vision: {
      scenes: [],
      objects: [],
      faces: [],
      safety: {}
    },
    audio: {
      transcript: null
    },
    textSignals: {
      ocrText: null
    },
    embeddings: {
      image: [],
      text: []
    },

    // orchestration state
    status: 'INGESTED',
    lastUpdatedAt: new Date().toISOString()
  };
}

/**
 * Recomputes the overall status of an AIR based on extractor coverage.
 * 
 * @param {Object} air 
 * @returns {string} - New status
 */
export function computeStatus(air) {
  const extractorEntries = Object.values(air.extractors);
  
  if (extractorEntries.length === 0) return 'INGESTED';

  const allSuccess = extractorEntries.every(e => e.status === 'success' || e.status === 'partial');
  const someRunning = extractorEntries.some(e => e.status === 'running' || e.status === 'pending');

  // Logic: if required extractors for this type are done
  // For now, simple heuristic:
  if (allSuccess) return 'READY_FOR_SYNTHESIS';
  if (someRunning) return 'EXTRACTING';
  
  return 'PARTIAL';
}
