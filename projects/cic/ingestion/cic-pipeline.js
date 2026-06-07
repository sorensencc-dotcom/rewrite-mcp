#!/usr/bin/env node
/**
 * cic-pipeline.js
 * @version 3.0.0
 * @date 2026-05-31
 *
 * Full CIC Pipeline Automation:
 * 1) Run baseline consistency harness
 * 2) Pick newest baseline file
 * 3) Compute SHA-256 signature
 * 4) Upload to Google Drive (resumable)
 * 5) Delete old Drive versions (keeps only latest)
 * 6) Write manifest.json with metadata
 * 7) Send Slack/Discord notifications
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: 'C:/Users/soren/cic/.env' });

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_DRIVE_REFRESH_TOKEN,
  GOOGLE_DRIVE_FOLDER_ID,
  SLACK_WEBHOOK_URL,
  DISCORD_WEBHOOK_URL
} = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_DRIVE_REFRESH_TOKEN) {
  console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_DRIVE_REFRESH_TOKEN in .env');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

/* ======================== BASELINE HARNESS ======================== */

async function runBaselineHarness() {
  console.log('\n▶ Step 1: Running baseline consistency harness...\n');

  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['baseline-consistency-harness.js'], {
      cwd: ROOT,
      stdio: 'inherit'
    });

    proc.on('exit', (code) => {
      if (code === 0) {
        console.log('✓ Baseline harness complete\n');
        resolve();
      } else {
        reject(new Error(`Baseline harness exited with code ${code}`));
      }
    });
  });
}

/* ======================== FILE SELECTION ======================== */

async function getNewestBaseline() {
  console.log('▶ Step 2: Finding newest baseline...');

  const files = await fs.readdir(ROOT);
  const baselines = files.filter(
    f => f.startsWith('baseline-results-') && f.endsWith('.json')
  );

  if (baselines.length === 0) {
    throw new Error('No baseline-results-*.json files found');
  }

  const withStats = await Promise.all(
    baselines.map(async f => ({
      name: f,
      mtime: (await fs.stat(path.join(ROOT, f))).mtimeMs
    }))
  );

  withStats.sort((a, b) => b.mtime - a.mtime);
  const newest = withStats[0];

  console.log(`✓ Newest baseline: ${newest.name}\n`);
  return newest.name;
}

/* ======================== CRYPTO ======================== */

async function sha256File(filePath) {
  const data = await fs.readFile(filePath);
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  return { hash, bytes: data };
}

/* ======================== GOOGLE AUTH ======================== */

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

/* ======================== DRIVE FOLDER ======================== */

async function ensureFolder(accessToken, folderId) {
  if (folderId) {
    return folderId;
  }

  console.log('▶ Creating "CIC Baselines" folder on Drive...');

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
  console.log(`✓ Created folder: ${json.id}\n`);
  return json.id;
}

/* ======================== DRIVE LIST FILES ======================== */

async function listDriveBaselines(accessToken, folderId) {
  const q = encodeURIComponent(
    `'${folderId}' in parents and name contains 'baseline-results-' and trashed = false`
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,createdTime)`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    throw new Error(`List files failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  return json.files || [];
}

/* ======================== DRIVE UPLOAD ======================== */

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

async function uploadBytes(uploadUrl, bytes) {
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

/* ======================== DRIVE CLEANUP ======================== */

async function deleteOldVersions(accessToken, folderId, keepName) {
  console.log('▶ Cleaning old versions from Drive...');

  const files = await listDriveBaselines(accessToken, folderId);
  const toDelete = files.filter(f => f.name !== keepName);

  if (toDelete.length === 0) {
    console.log('✓ No old versions to delete\n');
    return;
  }

  console.log(`Deleting ${toDelete.length} old version(s)...`);

  for (const f of toDelete) {
    const url = `https://www.googleapis.com/drive/v3/files/${f.id}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      console.warn(`  ✗ Failed to delete ${f.name}: ${res.status}`);
    } else {
      console.log(`  ✓ Deleted ${f.name}`);
    }
  }

  console.log();
}

/* ======================== NOTIFICATIONS ======================== */

async function notifySlack(message) {
  if (!SLACK_WEBHOOK_URL) {
    return;
  }

  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message })
    });
  } catch (err) {
    console.warn(`Slack notification failed: ${err.message}`);
  }
}

async function notifyDiscord(message) {
  if (!DISCORD_WEBHOOK_URL) {
    return;
  }

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message })
    });
  } catch (err) {
    console.warn(`Discord notification failed: ${err.message}`);
  }
}

/* ======================== MANIFEST ======================== */

async function writeManifest(entry) {
  const manifestPath = path.join(ROOT, 'manifest.json');
  let manifest = [];

  try {
    const existing = await fs.readFile(manifestPath, 'utf8');
    manifest = JSON.parse(existing);
  } catch {
    manifest = [];
  }

  manifest.push(entry);
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('✓ manifest.json updated\n');
}

/* ======================== MAIN PIPELINE ======================== */

async function main() {
  const dryRunLabel = DRY_RUN ? ' [DRY-RUN]' : '';
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log(`║  CIC Complete Pipeline: Baseline → Upload → Notify${dryRunLabel.padEnd(8)}║`);
  console.log('╚════════════════════════════════════════════════════════╝');

  try {
    // 1) Run baseline harness
    await runBaselineHarness();

    // 2) Pick newest baseline
    const newestName = await getNewestBaseline();
    const baselinePath = path.join(ROOT, newestName);

    // 3) Compute SHA-256
    console.log('▶ Step 3: Computing SHA-256...');
    const { hash, bytes } = await sha256File(baselinePath);
    console.log(`✓ SHA-256: ${hash}\n`);

    // 4) Google auth + ensure folder
    console.log('▶ Step 4: Authenticating to Google Drive...');
    const accessToken = await getAccessToken();
    console.log('✓ Access token obtained');

    let folderId = GOOGLE_DRIVE_FOLDER_ID;
    if (DRY_RUN) {
      console.log('⧗ [dry-run] Would ensure Drive folder exists\n');
      folderId = GOOGLE_DRIVE_FOLDER_ID || 'DRY_RUN_FAKE_FOLDER';
    } else {
      folderId = await ensureFolder(accessToken, GOOGLE_DRIVE_FOLDER_ID);
    }

    // 5) Versioned filename (ISO timestamp)
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .split('-')
      .slice(0, -1)
      .join('-');

    const driveName = `${newestName.replace('.json', '')}-${timestamp}.json`;

    // 6) Upload to Drive
    console.log(`▶ Step 5: Uploading to Google Drive...`);
    console.log(`  Local:  ${newestName}`);
    console.log(`  Drive:  ${driveName}`);

    let uploaded = { id: 'DRY_RUN_NO_UPLOAD' };

    if (DRY_RUN) {
      console.log(`⧗ [dry-run] Would upload: ${driveName}\n`);
    } else {
      const uploadUrl = await startResumableUpload(accessToken, driveName, folderId);
      uploaded = await uploadBytes(uploadUrl, bytes);
      console.log(`✓ Uploaded: ${uploaded.id}\n`);
    }

    // 7) Delete old versions
    if (DRY_RUN) {
      console.log('⧗ [dry-run] Would delete old Drive versions\n');
    } else {
      await deleteOldVersions(accessToken, folderId, driveName);
    }

    // 8) Write manifest
    console.log('▶ Step 6: Writing manifest...');
    const manifestEntry = {
      localFile: newestName,
      driveFile: driveName,
      driveId: uploaded.id,
      sha256: hash,
      driveLink: `https://drive.google.com/file/d/${uploaded.id}/view`,
      timestamp: new Date().toISOString()
    };

    if (DRY_RUN) {
      console.log('⧗ [dry-run] Would write manifest entry:');
      console.log(JSON.stringify(manifestEntry, null, 2) + '\n');
    } else {
      await writeManifest(manifestEntry);
    }

    // 9) Notifications
    console.log('▶ Step 7: Sending notifications...');
    const notifMessage = [
      '🚀 CIC Baseline Pipeline Complete',
      `Local: ${newestName}`,
      `Drive: ${driveName}`,
      `SHA-256: ${hash}`,
      `Link: https://drive.google.com/file/d/${uploaded.id}/view`
    ].join('\n');

    if (DRY_RUN) {
      console.log('⧗ [dry-run] Would send Slack/Discord notification:');
      console.log(notifMessage + '\n');
    } else {
      await notifySlack(notifMessage);
      await notifyDiscord(notifMessage);
      console.log('✓ Notifications sent\n');
    }

    // Final report
    const status = DRY_RUN ? '⧗ CIC Pipeline Dry-Run Complete' : '✓ CIC Pipeline Complete';
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log(`║  ${status.padEnd(56)}║`);
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log(`File:       ${newestName}`);
    console.log(`Drive ID:   ${uploaded.id}${DRY_RUN ? ' (simulated)' : ''}`);
    console.log(`SHA-256:    ${hash}`);
    console.log(`Manifest:   ${path.join(ROOT, 'manifest.json')}${DRY_RUN ? ' (not written)' : ''}\n`);

  } catch (err) {
    console.error('\n✗ CIC Pipeline failed:', err.message);
    process.exit(1);
  }
}

main();
