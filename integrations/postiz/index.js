/**
 * integrations/postiz/index.js
 * @version 1.0.0
 * @date 2026-05-17
 *
 * Node.js wrapper for the Postiz social scheduling API.
 * Exposes postInsightsToSocial() for use by the CIC control-plane.
 *
 * Can be required as CJS (control-plane) or imported as ESM.
 * Uses dynamic import for node-fetch to stay compatible with both.
 *
 * Required env:
 *   POSTIZ_API_KEY    — Postiz API key
 *   POSTIZ_API_URL    — Postiz API base URL (default: https://app.postiz.com/api)
 *
 * Usage:
 *   const { postInsightsToSocial } = require('../../integrations/postiz');
 *   await postInsightsToSocial({ channel: 'twitter', message: '...', metadata: {} });
 */

'use strict';

const POSTIZ_API_URL = process.env.POSTIZ_API_URL ?? 'https://app.postiz.com/api';
const POSTIZ_API_KEY = process.env.POSTIZ_API_KEY;

function log(level, msg, fields = {}) {
  process.stdout.write(JSON.stringify({
    ts: new Date().toISOString(), level, msg, integration: 'postiz', ...fields,
  }) + '\n');
}

/**
 * Post a CIC insight to social media via Postiz.
 *
 * @param {{
 *   channel:   string,    — Postiz channel/integration ID (e.g. "twitter", "linkedin")
 *   message:   string,    — text content (max 500 chars recommended)
 *   metadata?: object,    — correlation_id, strategy, etc. stored in Postiz post tags
 *   scheduleAt?: string,  — ISO 8601 publish time (default: now)
 *   draft?: boolean,      — if true, save as draft (default: false)
 * }} params
 * @returns {Promise<{ ok: boolean, post_id?: string, status?: string }>}
 */
async function postInsightsToSocial({ channel, message, metadata = {}, scheduleAt, draft = false }) {
  if (!POSTIZ_API_KEY) throw new Error('[postiz] POSTIZ_API_KEY is required');
  if (!channel)        throw new Error('[postiz] channel is required');
  if (!message)        throw new Error('[postiz] message is required');

  const { default: fetch } = await import('node-fetch');

  const body = {
    content:     message,
    channels:    [channel],
    publish_at:  scheduleAt ?? new Date().toISOString(),
    status:      draft ? 'draft' : 'published',
    tags:        Object.entries(metadata).map(([k, v]) => `${k}:${String(v)}`),
  };

  const correlation_id = metadata.correlation_id;
  let res;
  try {
    res = await fetch(`${POSTIZ_API_URL}/posts`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${POSTIZ_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    log('error', 'integration_failed', { err: err.message, correlation_id });
    throw Object.assign(new Error(`[postiz] network error: ${err.message}`), { status: 502 });
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    log('error', 'integration_failed', {
      status: res.status, err: json.error ?? json.message ?? 'unknown', correlation_id,
    });
    throw Object.assign(
      new Error(`[postiz] API error ${res.status}: ${json.error ?? json.message ?? 'unknown'}`),
      { status: res.status }
    );
  }

  log('info', 'integration_ok', {
    post_id: json.id ?? json.post_id, channel, correlation_id,
  });

  return {
    ok:      true,
    post_id: json.id ?? json.post_id,
    status:  json.status,
  };
}

module.exports = { postInsightsToSocial };
