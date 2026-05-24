/**
 * projects/cic/orchestrator/src/assetOrchestrator.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * Asset Orchestrator (Intelligence Control Plane)
 * Manages the Unified Asset Intelligence Record (AIR) lifecycle.
 */

import { createAIR, computeStatus } from './air/model.js';
import { mergeExtractorResult } from './air/merger.js';
import { synthesizeAsset } from './synthesis/index.js';

// In-memory store for AIRs (per region)
// In production, this would be backed by Postgres or Redis
const airStore = new Map();
const synthesisStore = new Map();

/**
 * Handles 'asset.normalized' event.
 * Creates the initial AIR and sets up expected extractors.
 * 
 * @param {Object} event - { envelope, region }
 * @returns {Promise<Object>} - The created AIR
 */
export async function handleAssetNormalized(event) {
  const { envelope, region } = event;
  const key = `${envelope.id}:${region}`;

  if (airStore.has(key)) {
    console.warn(`[AssetOrchestrator] AIR already exists for asset ${envelope.id} in region ${region}`);
    return airStore.get(key);
  }

  const air = createAIR(envelope);
  
  // Set initial status to INGESTED
  air.status = 'INGESTED';
  
  airStore.set(key, air);
  console.log(`[AssetOrchestrator] Created AIR for asset ${envelope.id} [${air.status}]`);
  
  return air;
}

/**
 * Handles 'asset.extracted.<name>' event.
 * Merges new artifacts into the AIR and recomputes status.
 * 
 * @param {Object} event - ExtractorResult
 * @returns {Promise<Object>} - The updated AIR
 */
export async function handleExtractorResult(event) {
  const { assetId, region, extractor } = event;
  const key = `${assetId}:${region}`;

  let air = airStore.get(key);
  if (!air) {
    throw new Error(`[AssetOrchestrator] No AIR found for asset ${assetId} in region ${region}`);
  }

  // 1. Merge the result
  air = mergeExtractorResult(air, event);

  // 2. Recompute status
  const oldStatus = air.status;
  air.status = computeStatus(air);

  console.log(`[AssetOrchestrator] Updated AIR for asset ${assetId} [${oldStatus} -> ${air.status}] (from ${extractor.name})`);

  // 3. Check if ready for synthesis
  if (air.status === 'READY_FOR_SYNTHESIS' && oldStatus !== 'READY_FOR_SYNTHESIS') {
    await _triggerSynthesis(air);
  }

  return air;
}

/**
 * Returns the AIR for a given asset and region.
 */
export function getAIR(assetId, region) {
  return airStore.get(`${assetId}:${region}`);
}

/**
 * Returns the Synthesis Result for a given asset and region.
 */
export function getSynthesis(assetId, region) {
  return synthesisStore.get(`${assetId}:${region}`);
}

/**
 * Internal: Trigger synthesis for an asset.
 */
async function _triggerSynthesis(air) {
  console.log(`[AssetOrchestrator] Triggering synthesis for asset ${air.assetId} in region ${air.region}`);
  
  try {
    const output = await synthesizeAsset(air);
    synthesisStore.set(`${air.assetId}:${air.region}`, output);
    
    console.log(`[AssetOrchestrator] EVENT: asset.synthesized { assetId: ${air.assetId}, region: ${air.region} }`);
  } catch (err) {
    console.error(`[AssetOrchestrator] Synthesis failed for asset ${air.assetId}: ${err.message}`);
  }
}
