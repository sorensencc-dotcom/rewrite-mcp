// filename: pipelines/corpusBuilder.js
// date: 2026-05-16
// version: 1.0.0

/**
 * CIC v3.0 — Pipeline: corpusBuilder
 *
 * Consumes an extraction result (from runSidecar or directly from an extractor)
 * and merges its payload into a running corpus object.
 *
 * Corpus shape:
 *   people    — FaceDetection[] (from image:v2 payload.faces)
 *   entities  — SceneObject[]   (from image:v2 payload.objects)
 *   tags      — string[]        (from image:v2 payload.labels, deduplicated)
 *   vectors   — string[]        (from image:v2 payload.embeddings, hint-level)
 *
 * Design:
 *   - Stateless: accepts an existing corpus and returns a new merged copy.
 *   - Idempotent: deduplicates tags.
 *   - Extensible: new extract types add new `if (extract.type === X)` branches.
 *   - Zero silent failures: unknown extract types are logged as warnings.
 */

import { createLogger } from '../core/logger.js';

const log = createLogger('pipeline.corpusBuilder');

// ---------------------------------------------------------------------------
// createCorpus
// ---------------------------------------------------------------------------

/**
 * Creates an empty corpus object.
 *
 * @returns {{
 *   people: object[],
 *   entities: object[],
 *   tags: string[],
 *   vectors: string[]
 * }}
 */
export function createCorpus() {
  return {
    people:   [],
    entities: [],
    tags:     [],
    vectors:  [],
  };
}

// ---------------------------------------------------------------------------
// mergeIntoCorpus
// ---------------------------------------------------------------------------

/**
 * Merges an extraction result into an existing corpus, returning a new corpus.
 * The input corpus is not mutated.
 *
 * @param {{
 *   people: object[],
 *   entities: object[],
 *   tags: string[],
 *   vectors: string[]
 * }} corpus - existing corpus (use createCorpus() for a fresh one)
 *
 * @param {{
 *   type: string,
 *   version: string,
 *   payload: object,
 *   extractorResult?: object
 * }} extract - normalized extraction result from runSidecar() or a wrapper extractor
 *
 * @returns {{
 *   people: object[],
 *   entities: object[],
 *   tags: string[],
 *   vectors: string[]
 * }} new merged corpus
 */
export function mergeIntoCorpus(corpus, extract) {
  // Clone arrays — no mutation of input corpus.
  const next = {
    people:   [...corpus.people],
    entities: [...corpus.entities],
    tags:     [...corpus.tags],
    vectors:  [...corpus.vectors],
  };

  if (extract.type === 'image') {
    const payload = extract.payload ?? {};

    // faces → people
    if (Array.isArray(payload.faces)) {
      next.people.push(...payload.faces);
    }

    // objects → entities
    if (Array.isArray(payload.objects)) {
      next.entities.push(...payload.objects);
    }

    // labels → tags (deduplicated)
    if (Array.isArray(payload.labels)) {
      const existing = new Set(next.tags);
      for (const label of payload.labels) {
        if (typeof label === 'string' && label.length > 0 && !existing.has(label)) {
          existing.add(label);
          next.tags.push(label);
        }
      }
    }

    // embeddings → vectors
    if (Array.isArray(payload.embeddings)) {
      next.vectors.push(...payload.embeddings.filter(e => typeof e === 'string'));
    }

    log.info('merged_image', {
      faces: payload.faces?.length ?? 0,
      objects: payload.objects?.length ?? 0,
      labels: payload.labels?.length ?? 0,
      embeddings: payload.embeddings?.length ?? 0,
      corpusTotals: {
        people: next.people.length,
        entities: next.entities.length,
        tags: next.tags.length,
        vectors: next.vectors.length,
      },
    });

    return next;
  }

  // Unknown extract type — warn and return corpus unchanged.
  log.warn('unknown_extract_type', { type: extract.type, version: extract.version });
  return next;
}

// ---------------------------------------------------------------------------
// buildCorpus (convenience: run sidecar + merge in one call)
// ---------------------------------------------------------------------------

/**
 * Convenience function: runs the sidecar pipeline for a job and merges the
 * result into an existing corpus.
 *
 * @param {import('../analyzers/iExtractor.js').ExtractorJob} job
 * @param {{
 *   people: object[],
 *   entities: object[],
 *   tags: string[],
 *   vectors: string[]
 * }} [corpus] - existing corpus; defaults to createCorpus()
 * @returns {Promise<{
 *   corpus: object,
 *   status: 'ok' | 'unsupported',
 *   extractorKey: string | null
 * }>}
 */
export async function buildCorpus(job, corpus = createCorpus()) {
  // Lazy import to avoid circular dependency with sidecar.js.
  const { runSidecar } = await import('./sidecar.js');

  const { status, extractorKey, result } = await runSidecar(job);

  if (status !== 'ok' || result === null) {
    return { corpus, status, extractorKey };
  }

  const merged = mergeIntoCorpus(corpus, result);
  return { corpus: merged, status, extractorKey };
}
