#!/usr/bin/env node
/**
 * fetch-contentdm-transcripts.mjs
 *
 * Minimal OCLC ContentDM API client for extracting primary digitized transcripts
 * (such as Benson Ford Accession 65 oral histories) to ground historical gap cards.
 *
 * Conforms to the Laziness Protocol (principle-laziness-protocol): zero npm dependencies,
 * standard Node.js fetch, direct binary streaming, and structured metadata sidecars.
 *
 * Usage:
 *   node fetch-contentdm-transcripts.mjs --collection <alias> --item-id <id> [--output-dir <path>] [--dry-run]
 *   node fetch-contentdm-transcripts.mjs --help
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';

const DEFAULT_BASE_URL = 'https://cdm15847.contentdm.oclc.org';
const DEFAULT_OUT_DIR = resolve('C:/dev/evidence/gap-32');

function parseArgs(argv) {
  const opts = {
    baseUrl: DEFAULT_BASE_URL,
    collection: '',
    itemId: '',
    outputDir: DEFAULT_OUT_DIR,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--base-url') opts.baseUrl = argv[++i];
    else if (arg === '--collection') opts.collection = argv[++i];
    else if (arg === '--item-id') opts.itemId = argv[++i];
    else if (arg === '--output-dir') opts.outputDir = resolve(argv[++i]);
  }
  return opts;
}

function printHelp() {
  console.log(`ContentDM Oral History Transcript Adapter

Options:
  --collection <alias>   ContentDM collection alias (e.g., p15847coll1)
  --item-id <id>         Record identifier within the collection
  --output-dir <path>    Destination folder (default: C:/dev/evidence/gap-32)
  --base-url <url>       Base ContentDM repository URL
  --dry-run              Verify endpoints and query shapes without writing files
  --help, -h             Show this help screen
`);
}

export async function fetchItemMetadata(baseUrl, collection, itemId) {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanColl = collection.replace(/^\/+/, '');
  const url = `${cleanBase}/digital/bl/dmwebservices/index.php?q=dmGetItemInfo/${cleanColl}/${itemId}/json`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'RewriteLabs-TRM-Ingress/1.0 (historical research archive)' },
  });

  if (!res.ok) {
    throw new Error(`ContentDM dmGetItemInfo failed (${res.status} ${res.statusText}) at ${url}`);
  }
  return res.json();
}

export async function fetchCompoundStructure(baseUrl, collection, itemId) {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanColl = collection.replace(/^\/+/, '');
  const url = `${cleanBase}/digital/bl/dmwebservices/index.php?q=dmGetCompoundObjectInfo/${cleanColl}/${itemId}/json`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'RewriteLabs-TRM-Ingress/1.0 (historical research archive)' },
  });

  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function buildPdfDownloadUrl(baseUrl, collection, itemId) {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanColl = collection.replace(/^\/+/, '');
  return `${cleanBase}/utils/getfile/collection/${cleanColl}/id/${itemId}/filename/${itemId}.pdf`;
}

export async function downloadPdfStream(url, outFilePath) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'RewriteLabs-TRM-Ingress/1.0 (historical research archive)' },
  });

  if (!res.ok) {
    throw new Error(`Failed to download binary transcript (${res.status} ${res.statusText}) from ${url}`);
  }

  const fileStream = createWriteStream(outFilePath);
  await finished(Readable.fromWeb(res.body).pipe(fileStream));
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  if (!opts.collection || !opts.itemId) {
    console.error('Error: --collection and --item-id are required arguments. Run with --help for usage.');
    process.exit(1);
  }

  console.log(`[ContentDM Adapter] Target: ${opts.collection}/${opts.itemId}`);
  console.log(`[ContentDM Adapter] Base URL: ${opts.baseUrl}`);
  console.log(`[ContentDM Adapter] Destination: ${opts.outputDir}`);

  const metaUrl = `${opts.baseUrl.replace(/\/+$/, '')}/digital/bl/dmwebservices/index.php?q=dmGetItemInfo/${opts.collection}/${opts.itemId}/json`;
  const pdfUrl = buildPdfDownloadUrl(opts.baseUrl, opts.collection, opts.itemId);

  if (opts.dryRun) {
    console.log('[ContentDM Adapter] Dry run mode enabled.');
    console.log(`  - Item Metadata API: ${metaUrl}`);
    console.log(`  - Binary Transcript URL: ${pdfUrl}`);
    console.log('Dry run complete. No requests dispatched.');
    return;
  }

  if (!existsSync(opts.outputDir)) {
    mkdirSync(opts.outputDir, { recursive: true });
  }

  console.log(`Fetching metadata from ${metaUrl}...`);
  let metadata = null;
  try {
    metadata = await fetchItemMetadata(opts.baseUrl, opts.collection, opts.itemId);
    const metaPath = join(opts.outputDir, `${opts.itemId}-metadata.json`);
    writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
    console.log(`Wrote metadata sidecar to ${metaPath}`);
  } catch (err) {
    console.warn(`[ContentDM Adapter] Warning: Could not retrieve item metadata: ${err.message}`);
  }

  console.log(`Checking compound document structure...`);
  const compound = await fetchCompoundStructure(opts.baseUrl, opts.collection, opts.itemId);
  if (compound) {
    const compPath = join(opts.outputDir, `${opts.itemId}-compound.json`);
    writeFileSync(compPath, JSON.stringify(compound, null, 2), 'utf8');
    console.log(`Wrote compound document structure to ${compPath}`);
  }

  const pdfPath = join(opts.outputDir, `${opts.itemId}.pdf`);
  console.log(`Downloading transcript stream to ${pdfPath}...`);
  try {
    await downloadPdfStream(pdfUrl, pdfPath);
    console.log(`Successfully extracted transcript to ${pdfPath}`);
  } catch (err) {
    console.error(`[ContentDM Adapter] Error downloading binary stream: ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('fetch-contentdm-transcripts.mjs')) {
  main().catch((err) => {
    console.error(`[ContentDM Adapter] Fatal error: ${err.message}`);
    process.exit(1);
  });
}
