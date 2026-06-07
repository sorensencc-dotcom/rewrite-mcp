#!/usr/bin/env node
/**
 * run-baseline-pipeline.js
 * @version 1.0.0
 * @date 2026-05-31
 *
 * CIC Complete Pipeline: Baseline → Upload → Report
 * Runs consistency baseline and uploads results to Google Drive in one command.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: 'C:/Users/soren/cic/.env' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_DRIVE_REFRESH_TOKEN,
  GOOGLE_DRIVE_FOLDER_ID
} = process.env;

if (!GOOGLE_DRIVE_REFRESH_TOKEN || !GOOGLE_DRIVE_FOLDER_ID) {
  console.error('Missing GOOGLE_DRIVE_REFRESH_TOKEN or GOOGLE_DRIVE_FOLDER_ID in .env');
  process.exit(1);
}

/**
 * Run a shell command and wait for completion
 */
function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: 'inherit' });
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with exit code ${code}`));
      } else {
        resolve();
      }
    });
    proc.on('error', reject);
  });
}

/**
 * Get fresh access token using refresh token
 */
async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      refresh_token: GOOGLE_DRIVE_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  }

  const { access_token } = await res.json();
  return access_token;
}

/**
 * Upload file to Drive folder
 */
async function uploadFile(filePath) {
  const accessToken = await getAccessToken();
  const fileName = path.basename(filePath);
  const fileBytes = await fs.readFile(filePath);

  // Start resumable upload session
  const startRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8'
      },
      body: JSON.stringify({
        name: fileName,
        parents: [GOOGLE_DRIVE_FOLDER_ID]
      })
    }
  );

  if (!startRes.ok) {
    throw new Error(`Failed to start upload: ${startRes.status} ${await startRes.text()}`);
  }

  const uploadUrl = startRes.headers.get('location');
  if (!uploadUrl) {
    throw new Error('Missing resumable upload URL');
  }

  // Upload bytes
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Length': fileBytes.length.toString(),
      'Content-Type': 'application/json'
    },
    body: fileBytes
  });

  if (!uploadRes.ok) {
    throw new Error(`Upload failed: ${uploadRes.status} ${await uploadRes.text()}`);
  }

  const uploaded = await uploadRes.json();
  return uploaded;
}

/**
 * Main pipeline
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  CIC Baseline Pipeline: Consistency → Drive Upload      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Run baseline harness
    console.log('📊 Step 1: Running baseline consistency harness...\n');
    await runCommand('node', ['baseline-consistency-harness.js']);

    // Step 2: Find the baseline results file
    console.log('\n🔍 Step 2: Locating baseline results...');
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `baseline-results-${dateStr}.json`;
    const filePath = path.join(__dirname, fileName);

    try {
      await fs.access(filePath);
    } catch {
      throw new Error(`Baseline results file not found: ${filePath}`);
    }

    console.log(`✓ Found: ${fileName}\n`);

    // Step 3: Upload to Drive
    console.log('☁️  Step 3: Uploading to Google Drive...');
    const result = await uploadFile(filePath);

    console.log('✓ Upload complete\n');

    // Final report
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  ✓ Pipeline Complete                                   ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log(`File:     ${fileName}`);
    console.log(`File ID:  ${result.id}`);
    console.log(`Drive:    https://drive.google.com/file/d/${result.id}/view\n`);

  } catch (err) {
    console.error('\n✗ Pipeline failed:', err.message);
    process.exit(1);
  }
}

main();
