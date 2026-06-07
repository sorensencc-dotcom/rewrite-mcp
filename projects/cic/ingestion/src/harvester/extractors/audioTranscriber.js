/**
 * audioTranscriber.js
 * @version 1.0.0
 * @date 2026-05-31
 *
 * Harvester audio-to-text extractor with production service integration.
 * Supports Whisper (OpenAI), AssemblyAI, Deepgram, with failover.
 *
 * Features:
 *   - Pre-flight audio size validation (100MB hard limit)
 *   - max_tokens output configuration
 *   - Retry logic with exponential backoff (300ms * (attempt + 1))
 *   - Service failover chain
 *   - Deterministic error envelopes
 *   - Token cost tracking
 *
 * Configuration via environment:
 *   TRANSCRIPTION_SERVICE  — 'whisper' | 'assemblyai' | 'deepgram' (default: 'whisper')
 *   OPENAI_API_KEY         — for Whisper
 *   ASSEMBLYAI_API_KEY     — for AssemblyAI
 *   DEEPGRAM_API_KEY       — for Deepgram
 */

const MAX_AUDIO_SIZE_MB = 100;
const RETRY_ATTEMPTS = 2;
const RETRY_BACKOFF_MS = 300;
const TRANSCRIPTION_TIMEOUT_MS = 60000; // 60s timeout for large files
const MAX_OUTPUT_TOKENS = 8000; // Conservative token limit for full transcription
const SERVICE = process.env.TRANSCRIPTION_SERVICE || 'whisper';

const MODULE = 'audioTranscriber';

export async function transcribeAudio({ audioData, audioFormat, fileName }) {
  // 1. Validate input size
  const audioSizeMB = Buffer.byteLength(audioData, 'base64') / (1024 * 1024);
  if (audioSizeMB > MAX_AUDIO_SIZE_MB) {
    return {
      error: 'AUDIO_TOO_LARGE',
      max_size_mb: MAX_AUDIO_SIZE_MB,
      actual_size_mb: audioSizeMB.toFixed(2),
      token_cost: 0
    };
  }

  if (!audioFormat || !/^(mp3|wav|m4a|flac|webm|ogg)$/i.test(audioFormat)) {
    return {
      error: 'INVALID_AUDIO_FORMAT',
      provided: audioFormat,
      supported: ['mp3', 'wav', 'm4a', 'flac', 'webm', 'ogg'],
      token_cost: 0
    };
  }

  // 2. Try transcription service with failover
  const services = [SERVICE, ...getFailoverChain(SERVICE)];
  let lastError;

  for (const svc of services) {
    try {
      const result = await _callTranscriptionService({
        service: svc,
        audioData,
        audioFormat,
        fileName,
      });
      return result;
    } catch (err) {
      lastError = err;
      console.warn(`[${MODULE}] ${svc} transcription failed: ${err.message}`);
      continue;
    }
  }

  // All services exhausted
  return {
    error: 'TRANSCRIPTION_FAILED_ALL_SERVICES',
    reason: lastError?.message || 'Unknown error',
    attempted_services: services.join(', '),
    token_cost: 0
  };
}

async function _callTranscriptionService({ service, audioData, audioFormat, fileName }) {
  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
    try {
      let result;

      if (service === 'whisper') {
        result = await _transcribeWithWhisper({ audioData, audioFormat, fileName });
      } else if (service === 'assemblyai') {
        result = await _transcribeWithAssemblyAI({ audioData, audioFormat, fileName });
      } else if (service === 'deepgram') {
        result = await _transcribeWithDeepgram({ audioData, audioFormat, fileName });
      } else {
        throw new Error(`Unknown transcription service: ${service}`);
      }

      // Validate result structure
      if (!result || typeof result !== 'object') {
        throw new Error(`${service} returned invalid result shape`);
      }

      if (typeof result.text !== 'string') {
        throw new Error(`${service} missing 'text' in result`);
      }

      // Enforce max tokens via substring
      const maxChars = MAX_OUTPUT_TOKENS * 4; // Conservative: 4 chars/token
      if (Buffer.byteLength(result.text, 'utf8') > maxChars) {
        console.warn(`[${MODULE}] ${service} transcription exceeded max tokens; truncating`);
        result.text = result.text.substring(0, Math.floor(maxChars / 4)); // Safe substring
      }

      return {
        text: result.text,
        service,
        language: result.language || 'en',
        duration_seconds: result.duration_seconds || null,
        confidence: result.confidence || null,
        token_cost: _estimateTokenCost(result.text),
        error: null
      };
    } catch (err) {
      if (attempt === RETRY_ATTEMPTS - 1) {
        throw err;
      }
      const backoffMs = RETRY_BACKOFF_MS * (attempt + 1);
      await new Promise(r => setTimeout(r, backoffMs));
    }
  }
}

async function _transcribeWithWhisper({ audioData, audioFormat, fileName }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable not set');
  }

  const { default: fetch } = await import('node-fetch');
  const FormData = (await import('form-data')).default;
  const stream = require('stream');

  const form = new FormData();
  form.append('file', stream.Readable.from([Buffer.from(audioData, 'base64')]), {
    filename: fileName || `audio.${audioFormat}`,
    contentType: `audio/${audioFormat}`,
  });
  form.append('model', 'whisper-1');
  form.append('response_format', 'json');
  form.append('temperature', '0.0');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRANSCRIPTION_TIMEOUT_MS);

  try {
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: form,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Whisper API error ${res.status}: ${errBody}`);
    }

    const json = await res.json();
    if (typeof json.text !== 'string') {
      throw new Error('Whisper API response missing "text" field');
    }

    return {
      text: json.text,
      language: json.language || 'en',
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Whisper transcription timeout after ${TRANSCRIPTION_TIMEOUT_MS}ms`);
    }
    throw err;
  }
}

async function _transcribeWithAssemblyAI({ audioData, audioFormat, fileName }) {
  if (!process.env.ASSEMBLYAI_API_KEY) {
    throw new Error('ASSEMBLYAI_API_KEY environment variable not set');
  }

  const { default: fetch } = await import('node-fetch');

  // Upload audio
  const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: {
      'Authorization': process.env.ASSEMBLYAI_API_KEY,
    },
    body: Buffer.from(audioData, 'base64'),
  });

  if (!uploadRes.ok) {
    throw new Error(`AssemblyAI upload failed: ${uploadRes.status}`);
  }

  const uploadJson = await uploadRes.json();
  const audioUrl = uploadJson.upload_url;

  // Submit transcription job
  const jobRes = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': process.env.ASSEMBLYAI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      language_code: 'en',
    }),
  });

  if (!jobRes.ok) {
    throw new Error(`AssemblyAI job submission failed: ${jobRes.status}`);
  }

  const jobJson = await jobRes.json();
  const transcriptId = jobJson.id;

  // Poll for completion (with timeout)
  const startTime = Date.now();
  const maxWaitMs = TRANSCRIPTION_TIMEOUT_MS;

  while (Date.now() - startTime < maxWaitMs) {
    const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: {
        'Authorization': process.env.ASSEMBLYAI_API_KEY,
      },
    });

    if (!pollRes.ok) {
      throw new Error(`AssemblyAI poll failed: ${pollRes.status}`);
    }

    const pollJson = await pollRes.json();

    if (pollJson.status === 'completed') {
      if (!pollJson.text) {
        throw new Error('AssemblyAI transcription returned empty text');
      }
      return {
        text: pollJson.text,
        language: 'en',
        confidence: pollJson.confidence || null,
      };
    }

    if (pollJson.status === 'error') {
      throw new Error(`AssemblyAI transcription error: ${pollJson.error}`);
    }

    // Wait before next poll
    await new Promise(r => setTimeout(r, 2000));
  }

  throw new Error(`AssemblyAI transcription timeout after ${maxWaitMs}ms`);
}

async function _transcribeWithDeepgram({ audioData, audioFormat, fileName }) {
  if (!process.env.DEEPGRAM_API_KEY) {
    throw new Error('DEEPGRAM_API_KEY environment variable not set');
  }

  const { default: fetch } = await import('node-fetch');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRANSCRIPTION_TIMEOUT_MS);

  try {
    const res = await fetch('https://api.deepgram.com/v1/listen?smart_format=true&language=en', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
        'Content-Type': `audio/${audioFormat}`,
      },
      body: Buffer.from(audioData, 'base64'),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Deepgram API error ${res.status}: ${errBody}`);
    }

    const json = await res.json();

    // Extract transcript from results
    if (!json.results || !json.results.channels) {
      throw new Error('Deepgram response missing expected structure');
    }

    const alternatives = json.results.channels[0]?.alternatives || [];
    if (!alternatives[0] || typeof alternatives[0].transcript !== 'string') {
      throw new Error('Deepgram response missing transcript');
    }

    return {
      text: alternatives[0].transcript,
      language: 'en',
      confidence: alternatives[0].confidence || null,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Deepgram transcription timeout after ${TRANSCRIPTION_TIMEOUT_MS}ms`);
    }
    throw err;
  }
}

function _estimateTokenCost(text) {
  // Conservative estimation: 4 characters per token
  // Actual token count depends on tokenizer but this is safe
  return Math.ceil((text.length) / 4);
}

function getFailoverChain(primary) {
  // If primary service fails, try others in order
  const all = ['whisper', 'assemblyai', 'deepgram'];
  return all.filter(svc => svc !== primary);
}
