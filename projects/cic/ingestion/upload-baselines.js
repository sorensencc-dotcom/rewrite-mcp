#!/usr/bin/env node
/**
 * upload-baselines.js
 * @version 2.0.0
 * @date 2026-05-31
 *
 * CIC Drive Sync Engine:
 * - Ensures Drive folder exists
 * - Uploads all baseline-results-*.json files
 * - Applies timestamp + versioning
 * - Writes manifest.json to Drive
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: 'C:/Users/soren/cic/.env' });

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_DRIVE_REFRESH_TOKEN,
  GOOGLE_DRIVE_FOLDER_ID
} = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_DRIVE_REFRESH_TOKEN) {
  console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_DRIVE_REFRESH_TOKEN in .env');
  process.exit(1);
}

const ROOT = process.cwd();

/* ----------------------------- TOKEN HANDLING ----------------------------- */

async function getAccessToken() {
  const tokenUrl = 'https://oauth2.googleapis.com/token';

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    refresh_token: GOOGLE_DRIVE_REFRESH_TOKEN,
    grant_type: 'refresh_token'
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  return json.access_token;
}

/* ----------------------------- DRIVE HELPERS ------------------------------ */

async function ensureFolder(accessToken, folderId) {
  if (folderId) return folderId;

  console.log('No folder ID provided — creating folder "CIC Baselines"');

  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'CIC Baselines',
      mimeType: 'application/vnd.google-apps.folder'
    })
  });

  if (!res.ok) {
    throw new Error(`Folder creation failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  console.log(`✓ Created folder: ${json.id}`);
  return json.id;
}

async function startResumableUpload(accessToken, fileName, folderId) {
  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8'
      },
      body: JSON.stringify({
        name: fileName,
        parents: [folderId]
      })
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to start upload: ${res.status} ${await res.text()}`);
  }

  return res.headers.get('location');
}

async function uploadBytes(uploadUrl, accessToken, bytes) {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Length': bytes.length.toString(),
      'Content-Type': 'application/json'
    },
    body: bytes
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

/* ----------------------------- VERSIONING -------------------------------- */

function computeVersion(existingFiles, baseName) {
  const matches = existingFiles
    .filter(f => f.startsWith(baseName))
    .map(f => {
      const m = f.match(/v(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    });

  const next = matches.length === 0 ? 1 : Math.max(...matches) + 1;
  return next;
}

/* ----------------------------- MAIN SYNC --------------------------------- */

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  CIC Drive Sync Engine: Versioned Baseline Upload       ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    const accessToken = await getAccessToken();

    // Ensure folder exists
    const folderId = await ensureFolder(accessToken, GOOGLE_DRIVE_FOLDER_ID);

    // Find all baseline files
    const files = await fs.readdir(ROOT);
    const baselines = files.filter(f => f.startsWith('baseline-results-') && f.endsWith('.json'));

    if (baselines.length === 0) {
      console.log('ℹ️  No baseline files found in:', ROOT);
      return;
    }

    console.log(`📦 Found ${baselines.length} baseline file(s)\n`);

    const manifest = [];

    for (const file of baselines) {
      const filePath = path.join(ROOT, file);
      const bytes = await fs.readFile(filePath);

      const baseName = file.replace('.json', '');
      const version = computeVersion(baselines, baseName);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('-').slice(0, -1).join('-');

      const driveName = `${baseName}-v${version}-${timestamp}.json`;

      console.log(`⬆️  Uploading ${file}`);
      console.log(`   → ${driveName}`);

      const uploadUrl = await startResumableUpload(accessToken, driveName, folderId);
      const uploaded = await uploadBytes(uploadUrl, accessToken, bytes);

      manifest.push({
        localFile: file,
        driveFile: driveName,
        driveId: uploaded.id,
        version,
        timestamp,
        driveLink: `https://drive.google.com/file/d/${uploaded.id}/view`
      });

      console.log(`   ✓ ${uploaded.id}\n`);
    }

    // Write manifest.json locally
    const manifestPath = path.join(ROOT, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  ✓ Sync Complete                                       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log(`Files uploaded: ${manifest.length}`);
    console.log(`Manifest: ${manifestPath}\n`);

    for (const entry of manifest) {
      console.log(`${entry.driveFile}`);
      console.log(`  ID: ${entry.driveId}`);
      console.log(`  Link: ${entry.driveLink}\n`);
    }

  } catch (err) {
    console.error('\n✗ Sync failed:', err.message);
    process.exit(1);
  }
}

main();
