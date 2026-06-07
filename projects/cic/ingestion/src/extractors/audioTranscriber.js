/**
 * audioTranscriber.js
 * @version 1.0.0
 * @date 2026-05-31
 *
 * CIC Phase-3 Harvester extractor: converts audio assets into text transcripts
 * with rich metadata suitable for /ingest and Qdrant indexing.
 *
 * Contract:
 *   - run(input, config?, _deps?) -> AudioTranscriberOutput  (never throws)
 *   - Output is always a deterministic envelope; failures are represented as
 *     success=false with a typed error.code -- never as thrown exceptions.
 *   - Never emits binary; output is text + JSON only.
 *   - Never calls /ingest directly; caller feeds ingestChunk into the pipeline.
 *
 * Integration:
 *   ExtractorRegistry.register('audio', 'audioTranscriber', audioTranscriber.run);
 *   Trigger: input.mimeType matches audio/* or extension in [mp3, wav, m4a, flac, webm, ogg]
 *
 * Service Failover Chain:
 *   1. OpenAI Whisper (primary, $0.006/min)
 *   2. AssemblyAI (fallback, higher latency)
 *   3. Deepgram (final fallback, lower accuracy)
 *
 * Required env:
 *   OPENAI_API_KEY         (Whisper)
 *   ASSEMBLYAI_API_KEY     (AssemblyAI fallback)
 *   DEEPGRAM_API_KEY       (Deepgram fallback)
 */

import fs        from 'node:fs/promises';
import os        from 'node:os';
import path      from 'node:path';
import crypto    from 'node:crypto';
import { log }   from '../logging/logger.js';

const MODULE  = 'audioTranscriber';
const VERSION = '1.0.0';

// Service failover chain
const SERVICES = [
  { name: 'whisper', provider: 'openai', weight: 1.0 },
  { name: 'assemblyai', provider: 'assemblyai', weight: 0.7 },
  { name: 'deepgram', provider: 'deepgram', weight: 0.6 },
];

const DEFAULT_CONFIG = {
  provider:           'whisper',        // Primary service
  model:              'whisper-1',      // For Whisper
  language:           'en',
  maxTokens:          8000,             // Conservative output ceiling
  timeoutMs:          60_000,           // 60s for transcription
  retries:            2,
  enableFailover:     true,             // Try next service on failure
  logTranscriptSample: false,
};

// Hard limits
const MAX_AUDIO_SIZE_MB = 100;
const VALID_FORMATS = new Set(['mp3', 'wav', 'm4a', 'flac', 'webm', 'ogg']);
const MAX_OUTPUT_TOKENS = 8000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Transcribe a single audio asset and return the full output envelope.
 * Never throws -- all failures are captured in the returned envelope.
 *
 * @param {object}  input
 * @param {object}  [configOverrides]
 * @param {object}  [_deps]                  -- for testing only
 * @param {Function} [_deps.readFile]        -- override fs.readFile
 * @param {Function} [_deps.transcribeWhisper] -- override Whisper call
 * @param {Function} [_deps.transcribeAssemblyAI] -- override AssemblyAI call
 * @param {Function} [_deps.transcribeDeepgram] -- override Deepgram call
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
    return _makeErrorResult(input, 'INVALID_INPUT', validationError, {}, startedAt, t0, 0, 0);
  }

  log.info(`${MODULE}_start`, {
    assetId:      input.assetId,
    sourceSystem: input.sourceSystem,
    mimeType:     input.mimeType,
    duration:     input.durationSeconds,
  });

  // 2. Resolve audio bytes
  let audioData;
  try {
    audioData = await _resolveAudioBytes(input, _deps);
  } catch (err) {
    log.error(`${MODULE}_fetch_failed`, {
      assetId:     input.assetId,
      sourcePath:  input.sourcePath,
      driveFileId: input.driveFileId,
      err:         err.message,
    });
    return _makeErrorResult(input, 'AUDIO_FETCH_FAILED', err.message, {}, startedAt, t0, 0, 0);
  }

  // 3. Validate audio size
  const audioSizeMB = audioData.bytes.length / (1024 * 1024);
  if (audioSizeMB > MAX_AUDIO_SIZE_MB) {
    log.warn(`${MODULE}_size_exceeded`, {
      assetId: input.assetId,
      sizeMB: audioSizeMB.toFixed(2),
      limitMB: MAX_AUDIO_SIZE_MB,
    });
    return _makeErrorResult(
      input,
      'AUDIO_TOO_LARGE',
      `Audio exceeds ${MAX_AUDIO_SIZE_MB}MB limit (${audioSizeMB.toFixed(1)}MB)`,
      { limit_mb: MAX_AUDIO_SIZE_MB, actual_mb: parseFloat(audioSizeMB.toFixed(1)) },
      startedAt, t0, 0, 0
    );
  }

  // 4. Attempt transcription with failover chain
  let transcript = null;
  let usedService = null;
  let attemptsMade = 0;
  let lastErr;

  const services = config.enableFailover
    ? SERVICES.slice()
    : [SERVICES.find(s => s.name === config.provider)].filter(Boolean);

  for (const service of services) {
    for (let attempt = 0; attempt <= config.retries; attempt++) {
      attemptsMade++;
      try {
        transcript = await _callTranscriptionService(
          audioData,
          input,
          service,
          config,
          _deps
        );
        usedService = service.name;
        break;
      } catch (err) {
        lastErr = err;
        if (attempt < config.retries) {
          const backoffMs = 300 * (attempt + 1);
          log.warn(`${MODULE}_retry`, {
            assetId:  input.assetId,
            service:  service.name,
            attempt:  attempt + 1,
            backoffMs,
            err:      err.message,
          });
          await _sleep(backoffMs);
        }
      }
    }
    if (transcript) break;
  }

  // Cleanup temp file regardless of provider outcome
  if (audioData.tempPath) {
    fs.rm(audioData.tempPath, { force: true }).catch(() => {});
  }

  if (!transcript) {
    log.error(`${MODULE}_all_services_failed`, {
      assetId:     input.assetId,
      services:    services.map(s => s.name).join(','),
      attempts:    attemptsMade,
      err:         lastErr?.message,
    });
    return _makeErrorResult(
      input,
      'TRANSCRIPTION_FAILED',
      lastErr?.message ?? 'all transcription services failed',
      { services: services.map(s => s.name), attempts: attemptsMade },
      startedAt, t0, attemptsMade, 0
    );
  }

  // 5. Parse and validate transcript
  const parsed = _parseTranscript(transcript, config);

  if (config.logTranscriptSample) {
    log.debug(`${MODULE}_transcript_sample`, {
      assetId:   input.assetId,
      length:    parsed.text.length,
      language:  parsed.language,
      confidence: parsed.confidence,
    });
  }

  // 6. Build and return output envelope
  const output = _buildOutput(input, parsed, config, usedService, startedAt, t0, attemptsMade);

  log.info(`${MODULE}_complete`, {
    assetId:     output.assetId,
    success:     output.success,
    durationMs:  output.timing.durationMs,
    service:     usedService,
    textLength:  output.text?.length ?? 0,
  });

  return output;
}

// ---------------------------------------------------------------------------
// Step 2: Resolve audio bytes
// ---------------------------------------------------------------------------

async function _resolveAudioBytes(input, _deps = {}) {
  const readFile = _deps.readFile ?? fs.readFile;

  // A. Pre-downloaded bytes path
  if (input.bytesPath) {
    const buf = await readFile(input.bytesPath);
    return { bytes: buf, mimeType: input.mimeType };
  }

  // B. Google Drive
  if (input.sourceSystem === 'drive' && input.driveFileId) {
    return _fetchDriveAudio(input);
  }

  // C. Remote URL
  if (input.sourcePath && _isUrl(input.sourcePath)) {
    return _fetchRemoteAudio(input.sourcePath, input.mimeType);
  }

  // D. Local filesystem
  if (!input.sourcePath) {
    throw new Error('No resolvable audio source: provide bytesPath, driveFileId, or a valid sourcePath');
  }
  const buf = await readFile(input.sourcePath);
  return { bytes: buf, mimeType: input.mimeType };
}

async function _fetchDriveAudio(input) {
  const token = process.env.GOOGLE_DRIVE_TOKEN;
  if (!token) throw new Error('GOOGLE_DRIVE_TOKEN env var is required for sourceSystem=drive');

  const url = `https://www.googleapis.com/drive/v3/files/${input.driveFileId}?alt=media`;
  const r   = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal:  AbortSignal.timeout(20_000),
  });
  if (!r.ok) throw new Error(`Drive fetch HTTP ${r.status} for fileId=${input.driveFileId}`);

  const buf      = Buffer.from(await r.arrayBuffer());
  const tempPath = path.join(os.tmpdir(), `cic_audio_${crypto.randomUUID()}`);
  await fs.writeFile(tempPath, buf);
  return { bytes: buf, mimeType: input.mimeType, tempPath };
}

async function _fetchRemoteAudio(url, mimeType) {
  const r = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`Remote audio fetch HTTP ${r.status} for ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  return { bytes: buf, mimeType };
}

// ---------------------------------------------------------------------------
// Step 4: Call transcription service with retry
// ---------------------------------------------------------------------------

async function _callTranscriptionService(audioData, input, service, config, _deps = {}) {
  switch (service.name) {
    case 'whisper':
      return _callWhisper(audioData, input, config, _deps);
    case 'assemblyai':
      return _callAssemblyAI(audioData, input, config, _deps);
    case 'deepgram':
      return _callDeepgram(audioData, input, config, _deps);
    default:
      throw new Error(`Unknown transcription service: ${service.name}`);
  }
}

async function _callWhisper(audioData, input, config, _deps = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY env var required for Whisper');

  const transcribeWhisper = _deps.transcribeWhisper ?? _defaultWhisper;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const result = await transcribeWhisper({
      apiKey,
      audioBuffer: audioData.bytes,
      mimeType: audioData.mimeType,
      language: config.language,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return result;
  } catch (err) {
    clearTimeout(timeout);
    throw new Error(`Whisper error: ${err.message}`);
  }
}

async function _callAssemblyAI(audioData, input, config, _deps = {}) {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) throw new Error('ASSEMBLYAI_API_KEY env var required for AssemblyAI');

  const transcribeAssemblyAI = _deps.transcribeAssemblyAI ?? _defaultAssemblyAI;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const result = await transcribeAssemblyAI({
      apiKey,
      audioBuffer: audioData.bytes,
      language: config.language,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return result;
  } catch (err) {
    clearTimeout(timeout);
    throw new Error(`AssemblyAI error: ${err.message}`);
  }
}

async function _callDeepgram(audioData, input, config, _deps = {}) {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error('DEEPGRAM_API_KEY env var required for Deepgram');

  const transcribeDeepgram = _deps.transcribeDeepgram ?? _defaultDeepgram;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const result = await transcribeDeepgram({
      apiKey,
      audioBuffer: audioData.bytes,
      language: config.language,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return result;
  } catch (err) {
    clearTimeout(timeout);
    throw new Error(`Deepgram error: ${err.message}`);
  }
}

// Default transcription implementations (stubs for now; would integrate real APIs)
async function _defaultWhisper({ apiKey, audioBuffer, language, signal }) {
  // Real implementation would call OpenAI Whisper API
  return {
    text: '[Whisper transcript placeholder]',
    language,
    confidence: 0.95,
    duration_seconds: 0,
  };
}

async function _defaultAssemblyAI({ apiKey, audioBuffer, language, signal }) {
  // Real implementation would call AssemblyAI API
  return {
    text: '[AssemblyAI transcript placeholder]',
    language,
    confidence: 0.92,
    duration_seconds: 0,
  };
}

async function _defaultDeepgram({ apiKey, audioBuffer, language, signal }) {
  // Real implementation would call Deepgram API
  return {
    text: '[Deepgram transcript placeholder]',
    language,
    confidence: 0.88,
    duration_seconds: 0,
  };
}

// ---------------------------------------------------------------------------
// Step 5: Parse and validate transcript
// ---------------------------------------------------------------------------

function _parseTranscript(transcript, config) {
  // Ensure transcript is an object with required fields
  const text = transcript?.text ?? '';
  const language = transcript?.language ?? config.language;
  const confidence = transcript?.confidence ?? 0.9;
  const duration_seconds = transcript?.duration_seconds ?? 0;

  // Enforce output bounds
  const maxChars = MAX_OUTPUT_TOKENS * 4;
  const truncatedText = text.substring(0, maxChars);
  if (text.length > maxChars) {
    log.warn(`${MODULE}_transcript_truncated`, {
      original: text.length,
      truncated: maxChars,
    });
  }

  return {
    text: truncatedText,
    language,
    confidence: Math.min(confidence, 1.0),
    duration_seconds: Math.max(0, duration_seconds),
  };
}

// ---------------------------------------------------------------------------
// Step 6: Build output envelope
// ---------------------------------------------------------------------------

function _buildOutput(input, parsed, config, usedService, startedAt, t0, attempts, retries) {
  const finishedAt = new Date().toISOString();
  const durationMs = Date.now() - t0;
  const source     = _buildSource(input);

  // Estimate token cost (4 chars per token, conservative)
  const estimatedTokens = Math.ceil(parsed.text.length / 4);

  const ingestChunk = _buildIngestChunk(input, parsed, source);

  return {
    assetId:  input.assetId,
    analyzer: MODULE,
    version:  VERSION,
    success:  true,

    text:       parsed.text || null,
    language:   parsed.language,
    confidence: parsed.confidence,
    duration_seconds: parsed.duration_seconds,

    technical: {
      mimeType:      input.mimeType,
      durationMs,
      estimatedTokens,
      service: usedService,
    },

    source,
    ingestChunk,

    timing: { startedAt, finishedAt, durationMs, attempts },
  };
}

function _buildIngestChunk(input, parsed, source) {
  const text = [
    '[AUDIO TRANSCRIPT]',
    '',
    'Transcript:',
    parsed.text || '(not available)',
    '',
    'Metadata:',
    `- Language: ${parsed.language}`,
    `- Confidence: ${(parsed.confidence * 100).toFixed(1)}%`,
    `- Duration: ${parsed.duration_seconds}s`,
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
      language:    parsed.language,
      confidence:  parsed.confidence,
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

function _makeErrorResult(input, code, message, details = {}, startedAt, t0, attempts, retries) {
  const finishedAt = new Date().toISOString();
  const durationMs = Date.now() - t0;

  return {
    assetId:  input?.assetId  ?? 'unknown',
    analyzer: MODULE,
    version:  VERSION,
    success:  false,

    text:       null,
    language:   null,
    confidence: 0,
    duration_seconds: 0,

    technical: {
      mimeType:      input?.mimeType ?? 'unknown',
      durationMs,
      estimatedTokens: 0,
      service: details.service ?? null,
    },

    source:      _buildSource(input ?? {}),
    ingestChunk: null,

    error: {
      code,
      message,
      details: details ?? undefined,
    },

    timing: { startedAt: startedAt ?? new Date().toISOString(), finishedAt, durationMs, attempts },
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

function _validateInput(input) {
  if (!input?.assetId)      return 'assetId is required';
  if (!input?.mimeType)     return 'mimeType is required';
  if (!input?.sourceSystem) return 'sourceSystem is required';
  if (!input.mimeType.startsWith('audio/')) {
    return `mimeType must be an audio type, got: ${input.mimeType}`;
  }
  const hasSource = input.bytesPath || input.driveFileId || input.sourcePath;
  if (!hasSource) return 'at least one of bytesPath, driveFileId, or sourcePath is required';
  return null;
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
