/**
 * ImageAnalyzerV2.js
 * @version 2.0.0
 * @date 2026-05-18
 *
 * CIC Phase-3 Harvester extractor: converts image assets into rich text
 * descriptions + structured metadata suitable for /ingest and Qdrant indexing.
 *
 * Contract:
 *   - run(input, config?, _deps?) -> ImageAnalyzerV2Output  (never throws)
 *   - Output is always a deterministic envelope; failures are represented as
 *     success=false with a typed error.code -- never as thrown exceptions.
 *   - Never emits binary; output is text + JSON only.
 *   - Never calls /ingest directly; caller feeds ingestChunk into the pipeline.
 *
 * Integration:
 *   ExtractorRegistry.register('image', 'ImageAnalyzerV2', ImageAnalyzerV2.run);
 *   Trigger: input.mimeType.startsWith('image/')
 *
 * Required env : ANTHROPIC_API_KEY
 * Conditional  : GOOGLE_DRIVE_TOKEN  (required when sourceSystem === 'drive')
 */

import Anthropic from '@anthropic-ai/sdk';
import fs        from 'node:fs/promises';
import os        from 'node:os';
import path      from 'node:path';
import crypto    from 'node:crypto';
import { log }   from '../logging/logger.js';

const MODULE  = 'ImageAnalyzerV2';
const VERSION = '2.0.0';

// ---------------------------------------------------------------------------
// Config defaults
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG = {
  provider:                   'claude',
  model:                      'claude-opus-4-6',
  maxTokens:                  1024,
  timeoutMs:                  30_000,
  retries:                    2,
  enableStructuredExtraction: true,
  logPromptSamples:           false,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyze a single image asset and return the full output envelope.
 * Never throws -- all failures are captured in the returned envelope.
 *
 * @param {object}  input
 * @param {object}  [configOverrides]
 * @param {object}  [_deps]                  -- for testing only
 * @param {Function} [_deps.readFile]        -- override fs.readFile
 * @param {Function} [_deps.anthropicCreate] -- override Anthropic messages.create
 * @returns {Promise<object>}
 */
export async function run(input, configOverrides = {}, _deps = {}) {
  const config    = { ...DEFAULT_CONFIG, ...configOverrides };
  const startedAt = new Date().toISOString();
  const t0        = Date.now();

  // 1. Validate input
  const validationError = _validateInput(input);
  if (validationError) {
    log.warn(`${MODULE}_invalid_input`, { assetId: input?.assetId, reason: validationError });
    return _makeErrorResult(input, 'INVALID_INPUT', validationError, {}, startedAt, t0, 0);
  }

  log.info(`${MODULE}_start`, {
    assetId:      input.assetId,
    sourceSystem: input.sourceSystem,
    mimeType:     input.mimeType,
    model:        config.model,
  });

  // 2. Resolve image bytes
  let imageData;
  try {
    imageData = await _resolveImageBytes(input, _deps);
  } catch (err) {
    log.error(`${MODULE}_fetch_failed`, {
      assetId:     input.assetId,
      sourcePath:  input.sourcePath,
      driveFileId: input.driveFileId,
      err:         err.message,
    });
    return _makeErrorResult(input, 'IMAGE_FETCH_FAILED', err.message, {}, startedAt, t0, 0);
  }

  // 3. Call vision provider with retry
  let providerText = null;
  let attemptsMade = 0;
  let lastErr;

  for (let attempt = 0; attempt <= config.retries; attempt++) {
    attemptsMade = attempt + 1;
    try {
      providerText = await _callVisionProvider(imageData, input.mimeType, config, _deps);
      break;
    } catch (err) {
      lastErr = err;
      if (attempt < config.retries) {
        const backoffMs = 300 * (attempt + 1);
        log.warn(`${MODULE}_retry`, {
          assetId:  input.assetId,
          attempt:  attempt + 1,
          backoffMs,
          err:      err.message,
        });
        await _sleep(backoffMs);
      }
    }
  }

  // retries = total attempts made minus the initial attempt
  const retryCount = attemptsMade - 1;

  // Cleanup temp file regardless of provider outcome
  if (imageData.tempPath) {
    fs.rm(imageData.tempPath, { force: true }).catch(() => {});
  }

  if (providerText === null) {
    log.error(`${MODULE}_provider_failed`, {
      assetId:  input.assetId,
      provider: config.provider,
      model:    config.model,
      retries:  retryCount,
      err:      lastErr?.message,
    });
    return _makeErrorResult(
      input,
      'VISION_PROVIDER_FAILED',
      lastErr?.message ?? 'unknown provider error',
      { provider: config.provider, raw: lastErr?.raw },
      startedAt, t0, retryCount,
    );
  }

  // 4. Parse provider response
  const parsed = _parseProviderResponse(providerText, config.enableStructuredExtraction);

  if (config.logPromptSamples) {
    log.debug(`${MODULE}_parsed_sample`, {
      assetId:     input.assetId,
      description: parsed.description?.slice(0, 200),
      tagCount:    parsed.tags.length,
    });
  }

  // 5. Build and return output envelope
  const output = _buildOutput(input, parsed, config, startedAt, t0, retryCount);

  log.info(`${MODULE}_complete`, {
    assetId:    output.assetId,
    success:    output.success,
    durationMs: output.timing.durationMs,
    tagCount:   output.tags.length,
    retries:    retryCount,
  });

  return output;
}

// ---------------------------------------------------------------------------
// Step 2: Resolve image bytes
// ---------------------------------------------------------------------------

async function _resolveImageBytes(input, _deps = {}) {
  const readFile = _deps.readFile ?? fs.readFile;

  // A. Pre-downloaded bytes path
  if (input.bytesPath) {
    const buf = await readFile(input.bytesPath);
    return { base64: buf.toString('base64'), mimeType: input.mimeType };
  }

  // B. Google Drive
  if (input.sourceSystem === 'drive' && input.driveFileId) {
    return _fetchDriveImage(input);
  }

  // C. Remote URL
  if (input.sourcePath && _isUrl(input.sourcePath)) {
    return _fetchRemoteImage(input.sourcePath, input.mimeType);
  }

  // D. Local filesystem
  if (!input.sourcePath) {
    throw new Error('No resolvable image source: provide bytesPath, driveFileId, or a valid sourcePath');
  }
  const buf = await readFile(input.sourcePath);
  return { base64: buf.toString('base64'), mimeType: input.mimeType };
}

async function _fetchDriveImage(input) {
  const token = process.env.GOOGLE_DRIVE_TOKEN;
  if (!token) throw new Error('GOOGLE_DRIVE_TOKEN env var is required for sourceSystem=drive');

  const url = `https://www.googleapis.com/drive/v3/files/${input.driveFileId}?alt=media`;
  const r   = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal:  AbortSignal.timeout(20_000),
  });
  if (!r.ok) throw new Error(`Drive fetch HTTP ${r.status} for fileId=${input.driveFileId}`);

  const buf      = Buffer.from(await r.arrayBuffer());
  const tempPath = path.join(os.tmpdir(), `cic_img_${crypto.randomUUID()}`);
  await fs.writeFile(tempPath, buf);
  return { base64: buf.toString('base64'), mimeType: input.mimeType, tempPath };
}

async function _fetchRemoteImage(url, mimeType) {
  const r = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`Remote image fetch HTTP ${r.status} for ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  return { base64: buf.toString('base64'), mimeType };
}

// ---------------------------------------------------------------------------
// Step 3: Call vision provider
// ---------------------------------------------------------------------------

async function _callVisionProvider(imageData, mimeType, config, _deps = {}) {
  if (config.provider === 'claude') {
    return _callClaude(imageData, mimeType, config, _deps);
  }
  throw new Error(`Unsupported vision provider: "${config.provider}". Implemented: ['claude']`);
}

async function _callClaude(imageData, mimeType, config, _deps = {}) {
  let anthropicCreate = _deps.anthropicCreate;
  if (!anthropicCreate) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    anthropicCreate = client.messages.create.bind(client.messages);
  }

  const structuredBlock = config.enableStructuredExtraction
    ? `\n\nAfter your description, output a JSON block wrapped in <json>...</json> tags with this exact shape:\n<json>\n{\n  "summary": "<one concise sentence optimized for semantic retrieval>",\n  "entities": {\n    "people": [],\n    "locations": [],\n    "organizations": [],\n    "objects": [],\n    "activities": [],\n    "emotions": [],\n    "timeOfDay": null,\n    "era": null\n  },\n  "tags": []\n}\n</json>\n\nRules:\n- Empty arrays for fields with no values; null for scalar fields with no value.\n- Tags: flat, lowercase, hyphenated (e.g. "assembly-line", "henry-ford", "1940s").\n- era: decade string if discernible (e.g. "1930s", "early-1900s").\n- Be precise; do not hallucinate people or places.`
    : '';

  const prompt = `You are analyzing an archival or documentary image for the Cast Iron Charlie project -- a feature documentary about Charles Emil Sorensen and Ford Motor Company history.\n\nProvide a rich, detailed natural language description of this image. Include:\n- What is depicted (people, objects, setting, activities)\n- Visual details relevant to historical research (clothing, vehicles, machinery, signage, architecture, scale)\n- Emotional tone or atmosphere if discernible\n- Any text, labels, or captions visible in the image\n- Contextual inferences appropriate for a 20th-century industrial/automotive archive${structuredBlock}`;

  const response = await anthropicCreate({
    model:      config.model,
    max_tokens: config.maxTokens,
    messages: [{
      role:    'user',
      content: [
        {
          type:   'image',
          source: {
            type:       'base64',
            media_type: _normalizeMediaType(mimeType),
            data:       imageData.base64,
          },
        },
        { type: 'text', text: prompt },
      ],
    }],
  });

  const text = response.content?.[0]?.text;
  if (!text) throw new Error('Claude returned empty content');
  return text;
}

// ---------------------------------------------------------------------------
// Step 4: Parse provider response
// ---------------------------------------------------------------------------

function _parseProviderResponse(rawText, enableStructured) {
  let description = rawText.trim();
  let summary     = null;
  let entities    = {};
  let tags        = [];

  if (enableStructured) {
    const jsonMatch = rawText.match(/<json>([\s\S]*?)<\/json>/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        summary  = typeof parsed.summary === 'string' ? parsed.summary : null;
        entities = parsed.entities && typeof parsed.entities === 'object' ? parsed.entities : {};
        tags     = Array.isArray(parsed.tags) ? parsed.tags.filter(t => typeof t === 'string') : [];
        description = rawText.replace(/<json>[\s\S]*?<\/json>/, '').trim();
      } catch (parseErr) {
        log.warn(`${MODULE}_json_parse_failed`, {
          snippet: rawText.slice(0, 120),
          err:     parseErr.message,
        });
      }
    } else {
      log.warn(`${MODULE}_json_block_missing`, { snippet: rawText.slice(0, 120) });
    }
  }

  return { description, summary, entities, tags };
}

// ---------------------------------------------------------------------------
// Step 5: Build output envelope
// ---------------------------------------------------------------------------

function _buildOutput(input, parsed, config, startedAt, t0, retries) {
  const finishedAt = new Date().toISOString();
  const durationMs = Date.now() - t0;
  const source     = _buildSource(input);

  const entities = {
    people:        _arr(parsed.entities.people),
    locations:     _arr(parsed.entities.locations),
    organizations: _arr(parsed.entities.organizations),
    objects:       _arr(parsed.entities.objects),
    activities:    _arr(parsed.entities.activities),
    emotions:      _arr(parsed.entities.emotions),
    timeOfDay:     parsed.entities.timeOfDay ?? null,
    era:           parsed.entities.era       ?? null,
  };

  const ingestChunk = _buildIngestChunk(input, parsed, entities, source);

  return {
    assetId:  input.assetId,
    analyzer: MODULE,
    version:  VERSION,
    success:  true,

    description: parsed.description || null,
    summary:     parsed.summary     || null,

    entities,
    tags: parsed.tags,

    technical: {
      mimeType:     input.mimeType,
      width:        undefined,
      height:       undefined,
      colorProfile: null,
    },

    source,
    ingestChunk,

    timing: { startedAt, finishedAt, durationMs, retries },
  };
}

function _buildIngestChunk(input, parsed, entities, source) {
  const fmt = (arr) => arr?.length ? arr.join(', ') : 'none';

  const text = [
    '[IMAGE DESCRIPTION]',
    '',
    'Description:',
    parsed.description || '(not available)',
    '',
    'Summary:',
    parsed.summary || '(not available)',
    '',
    'Entities:',
    `- People: ${fmt(entities.people)}`,
    `- Locations: ${fmt(entities.locations)}`,
    `- Organizations: ${fmt(entities.organizations)}`,
    `- Objects: ${fmt(entities.objects)}`,
    `- Activities: ${fmt(entities.activities)}`,
    `- Emotions: ${fmt(entities.emotions)}`,
    `- Time of day: ${entities.timeOfDay ?? 'unknown'}`,
    `- Era: ${entities.era ?? 'unknown'}`,
    '',
    'Source:',
    `- Filename: ${source.originalFilename ?? 'unknown'}`,
    `- Folder: ${source.folderPath ?? 'unknown'}`,
    `- Asset ID: ${input.assetId}`,
    `- Drive File ID: ${source.driveFileId ?? 'n/a'}`,
  ].join('\n');

  return {
    chunkId:  crypto.randomUUID(),
    assetId:  input.assetId,
    text,
    metadata: {
      assetId:     input.assetId,
      analyzer:    MODULE,
      version:     VERSION,
      tags:        parsed.tags,
      entities,
      source,
      mimeType:    input.mimeType,
      createdAt:   input.createdAt,
      folderPath:  input.folderPath,
      driveFileId: input.driveFileId,
    },
  };
}

// ---------------------------------------------------------------------------
// Error envelope
// ---------------------------------------------------------------------------

function _makeErrorResult(input, code, message, details = {}, startedAt, t0, retries) {
  const finishedAt = new Date().toISOString();
  const durationMs = Date.now() - t0;

  return {
    assetId:  input?.assetId  ?? 'unknown',
    analyzer: MODULE,
    version:  VERSION,
    success:  false,

    description: null,
    summary:     null,
    entities: {
      people: [], locations: [], organizations: [],
      objects: [], activities: [], emotions: [],
      timeOfDay: null, era: null,
    },
    tags: [],

    technical: {
      mimeType:     input?.mimeType ?? 'unknown',
      width:        undefined,
      height:       undefined,
      colorProfile: null,
    },

    source:      _buildSource(input ?? {}),
    ingestChunk: null,

    error: {
      code,
      message,
      provider: details.provider ?? undefined,
      raw:      details.raw      ?? undefined,
    },

    timing: { startedAt: startedAt ?? new Date().toISOString(), finishedAt, durationMs, retries },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _buildSource(input) {
  return {
    sourceSystem:     input.sourceSystem     ?? 'unknown',
    sourcePath:       input.sourcePath       ?? 'unknown',
    driveFileId:      input.driveFileId      ?? undefined,
    originalFilename: input.originalFilename ?? undefined,
    folderPath:       input.folderPath       ?? undefined,
    createdAt:        input.createdAt        ?? undefined,
    modifiedAt:       input.modifiedAt       ?? undefined,
    contextDocId:     input.contextDocId     ?? undefined,
  };
}

function _arr(v) {
  return Array.isArray(v) ? v.filter(x => typeof x === 'string') : [];
}

function _validateInput(input) {
  if (!input?.assetId)      return 'assetId is required';
  if (!input?.mimeType)     return 'mimeType is required';
  if (!input?.sourceSystem) return 'sourceSystem is required';
  if (!input.mimeType.startsWith('image/')) {
    return `mimeType must be an image type, got: ${input.mimeType}`;
  }
  const hasSource = input.bytesPath || input.driveFileId || input.sourcePath;
  if (!hasSource) return 'at least one of bytesPath, driveFileId, or sourcePath is required';
  return null;
}

/**
 * Claude SDK accepts only these four media_type values.
 * Map anything else to image/jpeg as a safe fallback.
 */
function _normalizeMediaType(mimeType) {
  const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
  const lower   = mimeType?.toLowerCase() ?? '';
  if (ALLOWED.has(lower))    return lower;
  if (lower === 'image/jpg') return 'image/jpeg';
  return 'image/jpeg';
}

function _isUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function _sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
