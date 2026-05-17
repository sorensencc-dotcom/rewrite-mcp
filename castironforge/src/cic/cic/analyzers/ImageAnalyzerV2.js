// filename: ImageAnalyzerV2.js
// date: 2026-05-16
// version: 2.0.0
// promoted-from: cast-iron-charlie/cic-ingestion/src/extractor/ImageAnalyzerV2.js

/**
 * Image Analyzer Extractor — v2
 *
 * Sub-extractors:
 *   1. Scene Graph       — objects, relationships, spatial layout
 *   2. Face Clusterer    — multi-face clustering w/ stable cluster IDs
 *   3. Place Recognizer  — landmark detection + architectural heuristics
 *   4. Cross-Referencer  — reverse image search + entity matching
 *
 * Output contract: imageAnalyzerV2.schema.json
 * All confidence values normalized 0–1.
 * All arrays sorted deterministically (descending confidence, then label alpha).
 */

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------

if (!process.env.GEMINI_API_KEY) {
  throw new Error('[ImageAnalyzerV2] Missing required env var: GEMINI_API_KEY');
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

export const meta = {
  id: 'image_analyzer_v2',
  version: '2.0.0',
  accepts: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
};

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

/**
 * Emits a structured JSON log line to stdout.
 * @param {'INFO'|'WARN'|'ERROR'} level
 * @param {string} action
 * @param {string} status
 * @param {Record<string,unknown>} [extra]
 */
function log(level, action, status, extra = {}) {
  process.stdout.write(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    agentId: 'image_analyzer_v2',
    action,
    status,
    ...extra
  }) + '\n');
}

// ---------------------------------------------------------------------------
// Gemini helpers
// ---------------------------------------------------------------------------

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-2.0-flash-latest';

/**
 * Posts a vision prompt + image bytes to Gemini and returns parsed JSON.
 * @param {string} prompt
 * @param {string} mimeType
 * @param {Buffer} imageBytes
 * @returns {Promise<unknown>}
 */
async function geminiVision(prompt, mimeType, imageBytes) {
  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: imageBytes.toString('base64') } }
        ]
      }],
      generationConfig: { temperature: 0 }
    })
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Gemini ${resp.status}: ${body.slice(0, 300)}`);
  }

  const json = await resp.json();
  const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!raw) throw new Error('Gemini returned empty text');

  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(cleaned);
}

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

/**
 * Clamps a numeric value to [0, 1]. Non-numeric → 0.
 * @param {unknown} v
 * @returns {number}
 */
function clampConf(v) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (!isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * Sorts an array of objects by confidence DESC, then by a label field ASC.
 * @template T
 * @param {T[]} arr
 * @param {keyof T} labelKey
 * @returns {T[]}
 */
function sortByConf(arr, labelKey) {
  return [...arr].sort((a, b) => {
    const cd = b.confidence - a.confidence;
    if (cd !== 0) return cd;
    return String(a[labelKey]).localeCompare(String(b[labelKey]));
  });
}

// ---------------------------------------------------------------------------
// Sub-extractor 1: Scene Graph
// ---------------------------------------------------------------------------

const SCENE_GRAPH_PROMPT = `Analyze this image and return a JSON scene graph.
Return ONLY valid JSON matching this schema exactly:
{
  "description": "one-sentence scene summary",
  "objects": [
    { "id": "obj_0", "label": "string", "confidence": 0.0 }
  ],
  "relationships": [
    { "subject": "obj_id", "predicate": "string", "object": "obj_id", "confidence": 0.0 }
  ],
  "spatialLayout": "string describing overall spatial arrangement",
  "dominantColors": ["hex_string"],
  "era": "estimated time period or null",
  "eraConfidence": 0.0,
  "overallConfidence": 0.0
}
Rules:
- object ids must be stable strings like "obj_0", "obj_1", etc.
- all confidence values are floats in [0, 1]
- relationships.subject and .object must reference valid object ids
- dominantColors: up to 5 hex strings, sorted descending by area coverage
- return null for era if undeterminable
- NO markdown, NO preamble`;

/**
 * @typedef {Object} SceneObject
 * @property {string} id
 * @property {string} label
 * @property {number} confidence
 */

/**
 * @typedef {Object} SceneRelationship
 * @property {string} subject
 * @property {string} predicate
 * @property {string} object
 * @property {number} confidence
 */

/**
 * @typedef {Object} SceneGraph
 * @property {string} description
 * @property {SceneObject[]} objects
 * @property {SceneRelationship[]} relationships
 * @property {string} spatialLayout
 * @property {string[]} dominantColors
 * @property {string|null} era
 * @property {number} eraConfidence
 * @property {number} overallConfidence
 */

/**
 * Extracts a scene graph from an image.
 * @param {string} mimeType
 * @param {Buffer} imageBytes
 * @returns {Promise<SceneGraph>}
 */
export async function extractSceneGraph(mimeType, imageBytes) {
  const raw = await geminiVision(SCENE_GRAPH_PROMPT, mimeType, imageBytes);

  const objects = Array.isArray(raw.objects)
    ? raw.objects.map((o, i) => ({
        id: typeof o.id === 'string' ? o.id : `obj_${i}`,
        label: typeof o.label === 'string' ? o.label : 'unknown',
        confidence: clampConf(o.confidence)
      }))
    : [];

  const validIds = new Set(objects.map(o => o.id));

  const relationships = Array.isArray(raw.relationships)
    ? raw.relationships
        .filter(r => validIds.has(r.subject) && validIds.has(r.object))
        .map(r => ({
          subject: r.subject,
          predicate: typeof r.predicate === 'string' ? r.predicate : 'near',
          object: r.object,
          confidence: clampConf(r.confidence)
        }))
    : [];

  return {
    description: typeof raw.description === 'string' ? raw.description : '',
    objects: sortByConf(objects, 'label'),
    relationships: sortByConf(relationships, 'predicate'),
    spatialLayout: typeof raw.spatialLayout === 'string' ? raw.spatialLayout : '',
    dominantColors: Array.isArray(raw.dominantColors)
      ? raw.dominantColors.filter(c => typeof c === 'string').slice(0, 5)
      : [],
    era: typeof raw.era === 'string' ? raw.era : null,
    eraConfidence: clampConf(raw.eraConfidence),
    overallConfidence: clampConf(raw.overallConfidence)
  };
}

// ---------------------------------------------------------------------------
// Sub-extractor 2: Face Clusterer
// ---------------------------------------------------------------------------

const FACE_CLUSTERER_PROMPT = `Analyze this image for human faces.
Return ONLY valid JSON matching this schema exactly:
{
  "faces": [
    {
      "faceIndex": 0,
      "boundingBox": { "xMin": 0.0, "yMin": 0.0, "xMax": 1.0, "yMax": 1.0 },
      "estimatedAge": "string or null",
      "estimatedGender": "string or null",
      "expression": "string or null",
      "identityHint": "string or null",
      "identityConfidence": 0.0,
      "detectionConfidence": 0.0,
      "embeddingHint": "string or null"
    }
  ],
  "clusters": [
    {
      "clusterId": "cluster_0",
      "faceIndices": [0],
      "representativeIndex": 0,
      "matchConfidence": 0.0,
      "identityLabel": "string or null"
    }
  ],
  "totalFaceCount": 0,
  "overallConfidence": 0.0
}
Rules:
- boundingBox values are normalized [0,1] relative to image dimensions
- clusterId must be stable strings like "cluster_0", "cluster_1"
- faceIndices reference the faces array by faceIndex
- embeddingHint is a short textual descriptor of facial geometry (not a real embedding vector)
- return empty arrays if no faces detected
- NO markdown, NO preamble`;

/**
 * @typedef {Object} BoundingBox
 * @property {number} xMin
 * @property {number} yMin
 * @property {number} xMax
 * @property {number} yMax
 */

/**
 * @typedef {Object} FaceDetection
 * @property {number} faceIndex
 * @property {BoundingBox} boundingBox
 * @property {string|null} estimatedAge
 * @property {string|null} estimatedGender
 * @property {string|null} expression
 * @property {string|null} identityHint
 * @property {number} identityConfidence
 * @property {number} detectionConfidence
 * @property {string|null} embeddingHint
 */

/**
 * @typedef {Object} FaceCluster
 * @property {string} clusterId
 * @property {number[]} faceIndices
 * @property {number} representativeIndex
 * @property {number} matchConfidence
 * @property {string|null} identityLabel
 */

/**
 * @typedef {Object} FaceClusterResult
 * @property {FaceDetection[]} faces
 * @property {FaceCluster[]} clusters
 * @property {number} totalFaceCount
 * @property {number} overallConfidence
 */

/**
 * Detects and clusters faces across an image.
 * @param {string} mimeType
 * @param {Buffer} imageBytes
 * @returns {Promise<FaceClusterResult>}
 */
export async function extractFaceClusters(mimeType, imageBytes) {
  const raw = await geminiVision(FACE_CLUSTERER_PROMPT, mimeType, imageBytes);

  const faces = Array.isArray(raw.faces)
    ? raw.faces.map((f, i) => {
        const bb = f.boundingBox ?? {};
        return {
          faceIndex: typeof f.faceIndex === 'number' ? f.faceIndex : i,
          boundingBox: {
            xMin: clampConf(bb.xMin ?? 0),
            yMin: clampConf(bb.yMin ?? 0),
            xMax: clampConf(bb.xMax ?? 1),
            yMax: clampConf(bb.yMax ?? 1)
          },
          estimatedAge: typeof f.estimatedAge === 'string' ? f.estimatedAge : null,
          estimatedGender: typeof f.estimatedGender === 'string' ? f.estimatedGender : null,
          expression: typeof f.expression === 'string' ? f.expression : null,
          identityHint: typeof f.identityHint === 'string' ? f.identityHint : null,
          identityConfidence: clampConf(f.identityConfidence),
          detectionConfidence: clampConf(f.detectionConfidence),
          embeddingHint: typeof f.embeddingHint === 'string' ? f.embeddingHint : null
        };
      })
    : [];

  const validFaceIndices = new Set(faces.map(f => f.faceIndex));

  const clusters = Array.isArray(raw.clusters)
    ? raw.clusters.map((c, i) => ({
        clusterId: typeof c.clusterId === 'string' ? c.clusterId : `cluster_${i}`,
        faceIndices: Array.isArray(c.faceIndices)
          ? c.faceIndices.filter(idx => validFaceIndices.has(idx)).sort((a, b) => a - b)
          : [],
        representativeIndex: typeof c.representativeIndex === 'number' ? c.representativeIndex : 0,
        matchConfidence: clampConf(c.matchConfidence),
        identityLabel: typeof c.identityLabel === 'string' ? c.identityLabel : null
      }))
    : [];

  const sortedClusters = [...clusters].sort((a, b) => {
    const cd = b.matchConfidence - a.matchConfidence;
    if (cd !== 0) return cd;
    return a.clusterId.localeCompare(b.clusterId);
  });

  return {
    faces: [...faces].sort((a, b) => b.detectionConfidence - a.detectionConfidence),
    clusters: sortedClusters,
    totalFaceCount: typeof raw.totalFaceCount === 'number' ? raw.totalFaceCount : faces.length,
    overallConfidence: clampConf(raw.overallConfidence)
  };
}

// ---------------------------------------------------------------------------
// Sub-extractor 3: Place Recognizer v2
// ---------------------------------------------------------------------------

const PLACE_RECOGNIZER_PROMPT = `Analyze this image for geographic locations, landmarks, and architectural style.
Return ONLY valid JSON matching this schema exactly:
{
  "candidates": [
    {
      "rank": 1,
      "label": "string",
      "type": "landmark|city|region|country|building|venue|natural_feature|unknown",
      "confidence": 0.0,
      "coordinates": { "lat": 0.0, "lon": 0.0 },
      "architecturalStyle": "string or null",
      "era": "string or null",
      "clues": ["string"]
    }
  ],
  "architecturalStyleSummary": "string or null",
  "indoorOutdoor": "indoor|outdoor|unknown",
  "overallConfidence": 0.0
}
Rules:
- candidates sorted by confidence DESC (rank 1 = highest confidence)
- coordinates may be null if unknown
- clues lists the visual evidence supporting the candidate
- return empty candidates array if location is undeterminable
- NO markdown, NO preamble`;

const VALID_PLACE_TYPES = new Set([
  'landmark','city','region','country','building','venue','natural_feature','unknown'
]);

/**
 * @typedef {Object} PlaceCandidate
 * @property {number} rank
 * @property {string} label
 * @property {string} type
 * @property {number} confidence
 * @property {{lat:number,lon:number}|null} coordinates
 * @property {string|null} architecturalStyle
 * @property {string|null} era
 * @property {string[]} clues
 */

/**
 * @typedef {Object} PlaceResult
 * @property {PlaceCandidate[]} candidates
 * @property {string|null} architecturalStyleSummary
 * @property {'indoor'|'outdoor'|'unknown'} indoorOutdoor
 * @property {number} overallConfidence
 */

/**
 * Recognizes places, landmarks, and architectural style in an image.
 * @param {string} mimeType
 * @param {Buffer} imageBytes
 * @returns {Promise<PlaceResult>}
 */
export async function extractPlaceRecognition(mimeType, imageBytes) {
  const raw = await geminiVision(PLACE_RECOGNIZER_PROMPT, mimeType, imageBytes);

  const candidates = Array.isArray(raw.candidates)
    ? raw.candidates.map((c, i) => {
        const coords = c.coordinates;
        return {
          rank: typeof c.rank === 'number' ? c.rank : i + 1,
          label: typeof c.label === 'string' ? c.label : 'unknown',
          type: VALID_PLACE_TYPES.has(c.type) ? c.type : 'unknown',
          confidence: clampConf(c.confidence),
          coordinates: coords && typeof coords.lat === 'number' && typeof coords.lon === 'number'
            ? { lat: coords.lat, lon: coords.lon }
            : null,
          architecturalStyle: typeof c.architecturalStyle === 'string' ? c.architecturalStyle : null,
          era: typeof c.era === 'string' ? c.era : null,
          clues: Array.isArray(c.clues)
            ? c.clues.filter(cl => typeof cl === 'string').sort()
            : []
        };
      })
    : [];

  // Deterministic sort: confidence DESC, label ASC
  const sortedCandidates = sortByConf(candidates, 'label')
    .map((c, i) => ({ ...c, rank: i + 1 }));

  const validIndoorOutdoor = ['indoor','outdoor','unknown'];
  const indoorOutdoor = validIndoorOutdoor.includes(raw.indoorOutdoor)
    ? raw.indoorOutdoor
    : 'unknown';

  return {
    candidates: sortedCandidates,
    architecturalStyleSummary: typeof raw.architecturalStyleSummary === 'string'
      ? raw.architecturalStyleSummary
      : null,
    indoorOutdoor,
    overallConfidence: clampConf(raw.overallConfidence)
  };
}

// ---------------------------------------------------------------------------
// Sub-extractor 4: Cross-Referencer
// ---------------------------------------------------------------------------

const CROSS_REFERENCE_PROMPT = `Analyze this image and identify any publicly known figures, locations, or entities.
Return ONLY valid JSON matching this schema exactly:
{
  "publicFigures": [
    {
      "label": "string",
      "role": "string or null",
      "confidence": 0.0,
      "sourceHint": "string"
    }
  ],
  "publicLocations": [
    {
      "label": "string",
      "locationType": "string",
      "confidence": 0.0,
      "sourceHint": "string"
    }
  ],
  "reverseImageHints": [
    {
      "description": "string",
      "likelySources": ["string"],
      "confidence": 0.0
    }
  ],
  "evidenceBundle": {
    "summary": "string",
    "conflictingSignals": ["string"],
    "mergedConfidence": 0.0
  }
}
Rules:
- Only include publicly verifiable information
- sourceHint describes the visual evidence used
- reverseImageHints describes likely origins of the image (publication, archive, etc.)
- likelySources lists probable source names or domains
- evidenceBundle merges all signals into a single confidence
- return empty arrays for sections with no findings
- NO markdown, NO preamble`;

/**
 * @typedef {Object} PublicFigureMatch
 * @property {string} label
 * @property {string|null} role
 * @property {number} confidence
 * @property {string} sourceHint
 */

/**
 * @typedef {Object} PublicLocationMatch
 * @property {string} label
 * @property {string} locationType
 * @property {number} confidence
 * @property {string} sourceHint
 */

/**
 * @typedef {Object} ReverseImageHint
 * @property {string} description
 * @property {string[]} likelySources
 * @property {number} confidence
 */

/**
 * @typedef {Object} EvidenceBundle
 * @property {string} summary
 * @property {string[]} conflictingSignals
 * @property {number} mergedConfidence
 */

/**
 * @typedef {Object} CrossReferenceResult
 * @property {PublicFigureMatch[]} publicFigures
 * @property {PublicLocationMatch[]} publicLocations
 * @property {ReverseImageHint[]} reverseImageHints
 * @property {EvidenceBundle} evidenceBundle
 */

/**
 * Performs external cross-referencing of publicly known entities in an image.
 * @param {string} mimeType
 * @param {Buffer} imageBytes
 * @returns {Promise<CrossReferenceResult>}
 */
export async function extractCrossReferences(mimeType, imageBytes) {
  const raw = await geminiVision(CROSS_REFERENCE_PROMPT, mimeType, imageBytes);

  const publicFigures = Array.isArray(raw.publicFigures)
    ? sortByConf(
        raw.publicFigures.map(f => ({
          label: typeof f.label === 'string' ? f.label : 'unknown',
          role: typeof f.role === 'string' ? f.role : null,
          confidence: clampConf(f.confidence),
          sourceHint: typeof f.sourceHint === 'string' ? f.sourceHint : ''
        })),
        'label'
      )
    : [];

  const publicLocations = Array.isArray(raw.publicLocations)
    ? sortByConf(
        raw.publicLocations.map(l => ({
          label: typeof l.label === 'string' ? l.label : 'unknown',
          locationType: typeof l.locationType === 'string' ? l.locationType : 'unknown',
          confidence: clampConf(l.confidence),
          sourceHint: typeof l.sourceHint === 'string' ? l.sourceHint : ''
        })),
        'label'
      )
    : [];

  const reverseImageHints = Array.isArray(raw.reverseImageHints)
    ? sortByConf(
        raw.reverseImageHints.map(h => ({
          description: typeof h.description === 'string' ? h.description : '',
          likelySources: Array.isArray(h.likelySources)
            ? h.likelySources.filter(s => typeof s === 'string').sort()
            : [],
          confidence: clampConf(h.confidence)
        })),
        'description'
      )
    : [];

  const eb = raw.evidenceBundle ?? {};
  const evidenceBundle = {
    summary: typeof eb.summary === 'string' ? eb.summary : '',
    conflictingSignals: Array.isArray(eb.conflictingSignals)
      ? eb.conflictingSignals.filter(s => typeof s === 'string').sort()
      : [],
    mergedConfidence: clampConf(eb.mergedConfidence)
  };

  return { publicFigures, publicLocations, reverseImageHints, evidenceBundle };
}

// ---------------------------------------------------------------------------
// Primary: extract()
// ---------------------------------------------------------------------------

/**
 * @typedef {import('./iExtractor.js').ExtractorJob} ExtractorJob
 * @typedef {import('./iExtractor.js').ExtractorResult} ExtractorResult
 */

/**
 * Runs all four sub-extractors and merges results into the v2 output contract.
 * @param {ExtractorJob} job
 * @returns {Promise<ExtractorResult>}
 */
export async function extract(job) {
  const start = Date.now();

  if (!meta.accepts.includes(job.mimeType)) {
    return {
      jobId: job.jobId,
      assetId: job.assetId,
      extractorId: meta.id,
      version: meta.version,
      status: 'unsupported',
      durationMs: Date.now() - start,
      data: null,
      error: `Unsupported MIME type: ${job.mimeType}`
    };
  }

  const subResults = {
    sceneGraph: null,
    faceClusters: null,
    placeRecognition: null,
    crossReferences: null
  };

  const subErrors = [];

  // Run sub-extractors independently — failures are isolated, not fatal.
  await Promise.allSettled([
    (async () => {
      try {
        subResults.sceneGraph = await extractSceneGraph(job.mimeType, job.payload);
        log('INFO', 'sub_extract', 'ok', { jobId: job.jobId, sub: 'sceneGraph' });
      } catch (err) {
        subErrors.push(`sceneGraph: ${err.message}`);
        log('WARN', 'sub_extract', 'error', { jobId: job.jobId, sub: 'sceneGraph', error: err.message });
      }
    })(),
    (async () => {
      try {
        subResults.faceClusters = await extractFaceClusters(job.mimeType, job.payload);
        log('INFO', 'sub_extract', 'ok', { jobId: job.jobId, sub: 'faceClusters' });
      } catch (err) {
        subErrors.push(`faceClusters: ${err.message}`);
        log('WARN', 'sub_extract', 'error', { jobId: job.jobId, sub: 'faceClusters', error: err.message });
      }
    })(),
    (async () => {
      try {
        subResults.placeRecognition = await extractPlaceRecognition(job.mimeType, job.payload);
        log('INFO', 'sub_extract', 'ok', { jobId: job.jobId, sub: 'placeRecognition' });
      } catch (err) {
        subErrors.push(`placeRecognition: ${err.message}`);
        log('WARN', 'sub_extract', 'error', { jobId: job.jobId, sub: 'placeRecognition', error: err.message });
      }
    })(),
    (async () => {
      try {
        subResults.crossReferences = await extractCrossReferences(job.mimeType, job.payload);
        log('INFO', 'sub_extract', 'ok', { jobId: job.jobId, sub: 'crossReferences' });
      } catch (err) {
        subErrors.push(`crossReferences: ${err.message}`);
        log('WARN', 'sub_extract', 'error', { jobId: job.jobId, sub: 'crossReferences', error: err.message });
      }
    })()
  ]);

  const allFailed = Object.values(subResults).every(v => v === null);

  if (allFailed) {
    return {
      jobId: job.jobId,
      assetId: job.assetId,
      extractorId: meta.id,
      version: meta.version,
      status: 'error',
      durationMs: Date.now() - start,
      data: null,
      error: `All sub-extractors failed: ${subErrors.join('; ')}`
    };
  }

  const data = {
    sceneGraph: subResults.sceneGraph,
    faceClusters: subResults.faceClusters,
    placeRecognition: subResults.placeRecognition,
    crossReferences: subResults.crossReferences,
    subExtractorErrors: subErrors.length > 0 ? subErrors : null
  };

  log('INFO', 'extract_complete', 'ok', {
    jobId: job.jobId,
    assetId: job.assetId,
    durationMs: Date.now() - start,
    subErrors: subErrors.length
  });

  return {
    jobId: job.jobId,
    assetId: job.assetId,
    extractorId: meta.id,
    version: meta.version,
    status: 'ok',
    durationMs: Date.now() - start,
    data,
    error: null
  };
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

/**
 * Verifies the extractor is ready to run.
 * @returns {Promise<{ok: boolean, detail: string}>}
 */
export async function healthCheck() {
  if (!process.env.GEMINI_API_KEY) {
    return { ok: false, detail: 'Missing GEMINI_API_KEY' };
  }
  return { ok: true, detail: `${meta.id} v${meta.version} ready` };
}
