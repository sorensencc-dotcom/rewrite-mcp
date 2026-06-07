/**
 * projects/cic/orchestrator/src/air/merger.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * AIR Merger Logic
 */

/**
 * Merges an ExtractorResult into an Asset Intelligence Record.
 * 
 * @param {Object} air 
 * @param {Object} result 
 * @returns {Object} - Updated AIR
 */
export function mergeExtractorResult(air, result) {
  const { extractor, artifacts, warnings } = result;

  // 1. Update extractor status
  air.extractors[extractor.name] = {
    version: extractor.version,
    lastRunAt: new Date().toISOString(),
    status: warnings && warnings.length > 0 ? 'partial' : 'success',
    warnings: warnings
  };

  // 2. Merge artifacts
  for (const artifact of artifacts) {
    _mergeArtifact(air, artifact);
  }

  air.lastUpdatedAt = new Date().toISOString();
  return air;
}

function _mergeArtifact(air, artifact) {
  const { type, payload } = artifact;

  if (type === 'annotation') {
    if (payload.kind === 'scene') {
      air.vision.scenes = _mergeUnique(air.vision.scenes, payload.labels, 'label');
    } else if (payload.kind === 'objects') {
      air.vision.objects = _mergeUnique(air.vision.objects, payload.objects, 'name');
    } else if (payload.kind === 'faces') {
      air.vision.faces = [...air.vision.faces, ...payload.faces];
    } else if (payload.kind === 'safety') {
      air.vision.safety = { ...air.vision.safety, ...payload };
    }
  } else if (type === 'document') {
    if (payload.kind === 'transcript') {
      air.audio.transcript = payload;
    } else if (payload.kind === 'ocr') {
      air.textSignals.ocrText = payload.text;
    }
  } else if (type === 'signal') {
    if (payload.kind === 'embedding') {
      if (payload.space === 'image') {
        air.embeddings.image.push({ dim: payload.dim, vectorId: payload.vectorId || 'internal' });
      } else {
        air.embeddings.text.push({ dim: payload.dim, vectorId: payload.vectorId || 'internal' });
      }
    }
  }
}

/**
 * Helper to merge unique items based on a key (e.g. label or name)
 */
function _mergeUnique(existing, incoming, key) {
  const map = new Map();
  existing.forEach(item => map.set(item[key], item));
  incoming.forEach(item => {
    const prev = map.get(item[key]);
    if (!prev || item.confidence > prev.confidence) {
      map.set(item[key], item);
    }
  });
  return Array.from(map.values());
}
