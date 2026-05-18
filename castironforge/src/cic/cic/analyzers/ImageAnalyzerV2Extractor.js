// filename: ImageAnalyzerV2Extractor.js
// date: 2026-05-16
// version: 1.0.0

/**
 * ImageAnalyzerV2Extractor — Hybrid Extractor Wrapper
 *
 * Wraps ImageAnalyzerV2 (IExtractor functional module) and adapts its output
 * into the corpus-friendly payload shape: { faces, objects, labels, embeddings }.
 *
 * Design note: The codebase uses the IExtractor functional pattern (module-level
 * named exports), not class inheritance. This wrapper follows the same pattern.
 * The SUPER BOB spec's BaseExtractor reference is resolved here as a factory
 * function that returns a fully IExtractor-compatible object.
 *
 * Output shape (corpus payload):
 *   faces      — FaceDetection[] from faceClusters.faces
 *   objects    — SceneObject[] from sceneGraph.objects
 *   labels     — string[] compiled from scene objects + place candidates + public figures
 *   embeddings — string[] embeddingHint values per detected face (hint-level, not vectors)
 *
 * ExtractorResult.data source mapping:
 *   result.data.faceClusters.faces       → payload.faces
 *   result.data.sceneGraph.objects       → payload.objects
 *   [scene + place + figure labels]      → payload.labels
 *   result.data.faceClusters.faces[].embeddingHint → payload.embeddings
 */

import * as ImageAnalyzerV2 from './ImageAnalyzerV2.js';
import { validateExtractor } from './iExtractor.js';

// Validate at import time — fail fast if contract is broken.
validateExtractor(ImageAnalyzerV2);

// ---------------------------------------------------------------------------
// Extractor ID
// ---------------------------------------------------------------------------

const EXTRACTOR_ID = 'image:v2';

// ---------------------------------------------------------------------------
// Label compiler
// ---------------------------------------------------------------------------

/**
 * Compiles a flat, deduplicated, sorted string[] of semantic labels from all
 * sub-extractor results. Used to populate corpus.tags downstream.
 *
 * Sources (in order):
 *   1. sceneGraph.objects[].label
 *   2. placeRecognition.candidates[].label (confidence ≥ 0.4)
 *   3. crossReferences.publicFigures[].label (confidence ≥ 0.5)
 *
 * @param {Object} data - ExtractorResult.data from ImageAnalyzerV2.extract()
 * @returns {string[]}
 */
function compileLabels(data) {
  const seen = new Set();
  const out = [];

  function push(v) {
    if (typeof v === 'string' && v.length > 0 && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }

  // Scene objects
  const objects = data?.sceneGraph?.objects ?? [];
  for (const o of objects) push(o.label);

  // Place candidates (threshold: conf ≥ 0.4)
  const candidates = data?.placeRecognition?.candidates ?? [];
  for (const c of candidates) {
    if (c.confidence >= 0.4) push(c.label);
  }

  // Public figures (threshold: conf ≥ 0.5)
  const figures = data?.crossReferences?.publicFigures ?? [];
  for (const f of figures) {
    if (f.confidence >= 0.5) push(f.label);
  }

  return out.sort();
}

// ---------------------------------------------------------------------------
// Embedding hint extractor
// ---------------------------------------------------------------------------

/**
 * Extracts embeddingHint strings from detected faces.
 * These are textual descriptors — not real embedding vectors.
 * Null/absent hints are filtered out.
 *
 * @param {Object} data - ExtractorResult.data
 * @returns {string[]}
 */
function compileEmbeddings(data) {
  const faces = data?.faceClusters?.faces ?? [];
  return faces
    .map(f => f.embeddingHint)
    .filter(h => typeof h === 'string' && h.length > 0);
}

// ---------------------------------------------------------------------------
// IExtractor-compatible module exports
// ---------------------------------------------------------------------------

/**
 * Extractor metadata. Exposes image:v2 as the canonical extractor ID,
 * while delegating the actual MIME acceptance list to ImageAnalyzerV2.
 * @type {{ id: string, version: string, accepts: string[] }}
 */
export const meta = {
  id: EXTRACTOR_ID,
  version: '1.0.0',
  accepts: ImageAnalyzerV2.meta.accepts,
};

/**
 * Runs ImageAnalyzerV2.extract() and normalizes the result into the
 * corpus-ready payload shape.
 *
 * @param {import('./iExtractor.js').ExtractorJob} job
 * @returns {Promise<{
 *   type: 'image',
 *   version: '2.0.0',
 *   payload: {
 *     faces: import('./ImageAnalyzerV2.js').FaceDetection[],
 *     objects: import('./ImageAnalyzerV2.js').SceneObject[],
 *     labels: string[],
 *     embeddings: string[]
 *   },
 *   extractorResult: import('./iExtractor.js').ExtractorResult
 * }>}
 */
export async function extract(job) {
  const result = await ImageAnalyzerV2.extract(job);

  // Surface extractor-level failures — do not silently swallow.
  if (result.status === 'error') {
    throw new Error(
      `[ImageAnalyzerV2Extractor] extraction failed for job ${job.jobId}: ${result.error}`
    );
  }

  // Unsupported MIME type — propagate as-is.
  if (result.status === 'unsupported') {
    return {
      type: 'image',
      version: '2.0.0',
      payload: { faces: [], objects: [], labels: [], embeddings: [] },
      extractorResult: result,
    };
  }

  const data = result.data ?? {};

  return {
    type: 'image',
    version: '2.0.0',
    payload: {
      faces:      data.faceClusters?.faces   ?? [],
      objects:    data.sceneGraph?.objects   ?? [],
      labels:     compileLabels(data),
      embeddings: compileEmbeddings(data),
    },
    extractorResult: result,
  };
}

/**
 * Delegates health check to ImageAnalyzerV2.
 * @returns {Promise<{ok: boolean, detail: string}>}
 */
export async function healthCheck() {
  return ImageAnalyzerV2.healthCheck();
}
