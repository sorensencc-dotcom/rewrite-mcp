/**
 * harvest-photos.js
 * @version 1.0.0
 * @date 2026-05-18
 *
 * CIC Photo Harvest — runs ImageAnalyzerV2 against a Google Drive image folder
 * and POSTs each resulting ingestChunk to the intelligence server at /ingest.
 *
 * Usage:
 *   node scripts/harvest-photos.js [--folder=<driveFileId>] [--limit=<n>] [--dry-run]
 *
 * Required env : ANTHROPIC_API_KEY, GOOGLE_DRIVE_TOKEN
 * Optional env : INTELLIGENCE_SERVER (default: http://localhost:4000)
 *                INTELLIGENCE_TOKEN  (shared secret if server requires it)
 *
 * Defaults to the Sorensen Photos folder: 1caRxpKodPCG0qr1ZKpOKdIoXrat-KM1j
 */

import 'dotenv/config';
import { run as analyzeImage } from '../src/extractors/ImageAnalyzerV2.js';
import { log }                 from '../src/logging/logger.js';

const MODULE            = 'harvest-photos';
const DRIVE_API         = 'https://www.googleapis.com/drive/v3';
const DEFAULT_FOLDER_ID = '1caRxpKodPCG0qr1ZKpOKdIoXrat-KM1j'; // Sorensen Photos
const SERVER_URL        = process.env.INTELLIGENCE_SERVER ?? 'http://localhost:4000';
const SERVER_TOKEN      = process.env.INTELLIGENCE_TOKEN  ?? null;

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args     = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; })
);

const FOLDER_ID = args.folder  ?? DEFAULT_FOLDER_ID;
const LIMIT     = args.limit   ? parseInt(args.limit, 10) : Infinity;
const DRY_RUN   = args['dry-run'] === true || args['dry-run'] === 'true';

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const token = process.env.GOOGLE_DRIVE_TOKEN;
  if (!token) {
    log.error(`${MODULE}_missing_token`, { msg: 'GOOGLE_DRIVE_TOKEN is not set in .env' });
    process.exit(1);
  }

  if (DRY_RUN) log.info(`${MODULE}_dry_run`, { msg: 'DRY RUN — no data will be ingested' });

  log.info(`${MODULE}_start`, { folderId: FOLDER_ID, limit: LIMIT, dryRun: DRY_RUN });

  // 1. List all image files in the folder (paginated)
  const files = await listDriveImages(token, FOLDER_ID, LIMIT);
  log.info(`${MODULE}_files_found`, { count: files.length });

  if (files.length === 0) {
    log.info(`${MODULE}_nothing_to_do`, { folderId: FOLDER_ID });
    return;
  }

  // 2. Process each image
  const stats = { total: files.length, analyzed: 0, ingested: 0, skipped: 0, errors: [] };

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    log.info(`${MODULE}_processing`, {
      index:    `${i + 1}/${files.length}`,
      filename: file.name,
      fileId:   file.id,
    });

    // Run ImageAnalyzerV2
    const result = await analyzeImage({
      assetId:          file.id,
      mimeType:         file.mimeType,
      sourceSystem:     'drive',
      driveFileId:      file.id,
      originalFilename: file.name,
      folderPath:       `drive:${FOLDER_ID}`,
      createdAt:        file.createdTime,
      modifiedAt:       file.modifiedTime,
    });

    stats.analyzed++;

    if (!result.success) {
      log.warn(`${MODULE}_analyze_failed`, {
        filename: file.name,
        error:    result.error?.code,
        msg:      result.error?.message,
      });
      stats.errors.push(`${file.name}: [${result.error?.code}] ${result.error?.message}`);
      stats.skipped++;
      continue;
    }

    if (!result.ingestChunk) {
      log.warn(`${MODULE}_no_chunk`, { filename: file.name });
      stats.skipped++;
      continue;
    }

    log.info(`${MODULE}_analyzed`, {
      filename: file.name,
      tags:     result.tags.slice(0, 5),
      era:      result.entities.era,
      people:   result.entities.people,
    });

    // POST to intelligence server /ingest
    if (!DRY_RUN) {
      try {
        await postIngest(result.ingestChunk);
        stats.ingested++;
        log.info(`${MODULE}_ingested`, { filename: file.name, chunkId: result.ingestChunk.chunkId });
      } catch (err) {
        log.error(`${MODULE}_ingest_failed`, { filename: file.name, err: err.message });
        stats.errors.push(`${file.name} (ingest): ${err.message}`);
        stats.skipped++;
      }
    } else {
      log.info(`${MODULE}_dry_run_chunk`, {
        filename:    file.name,
        chunkId:     result.ingestChunk.chunkId,
        textPreview: result.ingestChunk.text.slice(0, 120),
      });
      stats.ingested++;
    }

    // Brief pause to avoid hammering the vision API
    if (i < files.length - 1) await sleep(500);
  }

  // 3. Summary
  log.info(`${MODULE}_complete`, stats);

  if (stats.errors.length > 0) {
    console.error('\nErrors:');
    stats.errors.forEach(e => console.error(' •', e));
  }

  console.log(`\n✓ Done — ${stats.ingested} ingested, ${stats.skipped} skipped, ${stats.errors.length} errors`);
}

// ---------------------------------------------------------------------------
// Drive helpers
// ---------------------------------------------------------------------------

async function listDriveImages(token, folderId, limit) {
  const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const q = [
    'trashed = false',
    `'${folderId}' in parents`,
    `(${IMAGE_TYPES.map(m => `mimeType = '${m}'`).join(' or ')})`,
  ].join(' and ');

  const files   = [];
  let pageToken = null;

  do {
    const url = new URL(`${DRIVE_API}/files`);
    url.searchParams.set('q', q);
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('fields', 'nextPageToken,files(id,name,mimeType,createdTime,modifiedTime,size)');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const r = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) throw new Error(`Drive list HTTP ${r.status}: ${await r.text()}`);
    const json = await r.json();

    for (const f of json.files ?? []) {
      files.push(f);
      if (files.length >= limit) return files;
    }
    pageToken = json.nextPageToken ?? null;
  } while (pageToken);

  return files;
}

// ---------------------------------------------------------------------------
// Ingest helper
// ---------------------------------------------------------------------------

async function postIngest(chunk) {
  const headers = { 'Content-Type': 'application/json' };
  if (SERVER_TOKEN) headers['Authorization'] = `Bearer ${SERVER_TOKEN}`;

  const body = JSON.stringify({
    user_id: 'cic-photos',
    intent:  'image-archive',
    text:    chunk.text,
    source:  `drive:${chunk.metadata?.source?.originalFilename ?? chunk.assetId}`,
    metadata: chunk.metadata,
  });

  const r = await fetch(`${SERVER_URL}/ingest`, {
    method:  'POST',
    headers,
    body,
    signal:  AbortSignal.timeout(30_000),
  });

  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new Error(`Server /ingest HTTP ${r.status}: ${detail}`);
  }
}

// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(err => {
  log.error(`${MODULE}_fatal`, { err: err.message, stack: err.stack });
  process.exit(1);
});
