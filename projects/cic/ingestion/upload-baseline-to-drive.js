#!/usr/bin/env node
/**
 * upload-baseline-to-drive.js
 * @version 1.0.0
 * @date 2026-05-31
 *
 * Uploads baseline-results-YYYY-MM-DD.json to Google Drive folder.
 * Uses refresh token to ensure access token is fresh.
 */

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
 * Main
 */
async function main() {
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `baseline-results-${dateStr}.json`;
  const filePath = path.join(__dirname, fileName);

  try {
    // Check file exists
    await fs.access(filePath);

    console.log(`Uploading: ${fileName}`);
    const result = await uploadFile(filePath);

    console.log('✓ Upload complete');
    console.log(`File ID: ${result.id}`);
    console.log(`Drive link: https://drive.google.com/file/d/${result.id}/view`);

  } catch (err) {
    console.error('✗ Upload failed:', err.message);
    process.exit(1);
  }
}

main();
