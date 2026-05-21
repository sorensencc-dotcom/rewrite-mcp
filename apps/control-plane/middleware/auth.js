/**
 * middleware/auth.js
 * @version 1.0.0
 * @date 2026-05-17
 *
 * Google ID token validation middleware for the CIC control-plane.
 * Accepts bearer tokens issued by Google OAuth 2.0 (Google Auth Platform).
 *
 * Configuration (env):
 *   GOOGLE_CLIENT_ID      — OAuth 2.0 client ID for control-plane (required)
 *   ALLOWED_EMAILS        — comma-separated list of allowed operator emails (optional)
 *   AUTH_DISABLED         — set to "true" for local dev only (NEVER in production)
 *
 * Token flow:
 *   Operator-UI signs in with Google → receives ID token →
 *   sends as "Authorization: Bearer <id_token>" on every request →
 *   middleware verifies + attaches req.operator = { email, sub, name }
 */

'use strict';

const { OAuth2Client } = require('google-auth-library');

const CLIENT_ID      = process.env.GOOGLE_CLIENT_ID;
const ALLOWED_EMAILS = process.env.ALLOWED_EMAILS
  ? new Set(process.env.ALLOWED_EMAILS.split(',').map(e => e.trim().toLowerCase()))
  : null;
const AUTH_DISABLED  = process.env.AUTH_DISABLED === 'true';

let client;
if (!AUTH_DISABLED) {
  if (!CLIENT_ID) throw new Error('[auth] GOOGLE_CLIENT_ID is required');
  client = new OAuth2Client(CLIENT_ID);
}

/**
 * Express middleware — validates Google ID token.
 * Attaches req.operator = { email, sub, name } on success.
 */
async function requireAuth(req, res, next) {
  if (AUTH_DISABLED) {
    req.operator = { email: 'dev@local', sub: 'dev', name: 'Dev Mode' };
    return next();
  }

  const authHeader = req.headers['authorization'] ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const idToken = authHeader.slice(7);
  let ticket;
  try {
    ticket = await client.verifyIdToken({ idToken, audience: CLIENT_ID });
  } catch (err) {
    return res.status(401).json({ error: `Token verification failed: ${err.message}` });
  }

  const payload = ticket.getPayload();
  const email   = payload.email?.toLowerCase();

  if (ALLOWED_EMAILS && !ALLOWED_EMAILS.has(email)) {
    return res.status(403).json({ error: `Operator email not allowed: ${email}` });
  }

  req.operator = { email, sub: payload.sub, name: payload.name };
  next();
}

module.exports = { requireAuth };
