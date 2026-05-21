# Cloudflare Routing — CIC Control Room
<!-- @version 1.0.0 | @date 2026-05-17 -->

Hostname: `intelligence.rewritelabs.ai`
Origin:   CIC Control Plane (`apps/control-plane/`) behind Cloudflare Tunnel or origin-pull lock

---

## 1. DNS + Proxying

| Record | Type | Value | Proxy |
|--------|------|-------|-------|
| `intelligence.rewritelabs.ai` | A/CNAME | origin IP or Tunnel | ✓ (Orange-cloud) |

All traffic must flow through Cloudflare — **never expose origin IP directly.**

---

## 2. Origin Access Lock

### Option A — Cloudflare Tunnel (recommended)
```bash
# Install cloudflared and authenticate
cloudflared tunnel create cic-control-plane
cloudflared tunnel route dns cic-control-plane intelligence.rewritelabs.ai

# config.yml
tunnel: <TUNNEL_ID>
credentials-file: /home/.cloudflared/<TUNNEL_ID>.json
ingress:
  - hostname: intelligence.rewritelabs.ai
    service: http://localhost:3000
  - service: http_status:404
```

The control-plane origin never listens on a public port — Cloudflared connects outbound only.

### Option B — Cloudflare IP allowlist (firewall rule)
```
# WAF → Custom Rules → Create rule
# Name: "Allow CF IPs only"
# Expression: not (ip.src in $cloudflare_ips)
# Action: Block
```

Cloudflare IP ranges: https://www.cloudflare.com/ips/

---

## 3. Cache Rules (API routes must NOT be cached)

**Rule name:** `Bypass cache — API`

```
Expression: (http.host eq "intelligence.rewritelabs.ai" and
             starts_with(http.request.uri.path, "/") and
             not starts_with(http.request.uri.path, "/static"))
Cache status: Bypass
```

Or, set `Cache-Control: no-store` in the control-plane response headers (already done via Express JSON responses which default to no-cache).

---

## 4. Route Map

| Path prefix | Destination | Auth |
|-------------|-------------|------|
| `/health` | control-plane `/health` | None |
| `/metrics` | control-plane `/metrics` | Google ID token (middleware) |
| `/runs` | control-plane `/runs` | Google ID token |
| `/pipelines/*` | control-plane `/pipelines/*` | Google ID token |
| `/agents` | control-plane `/agents` | Google ID token |

All protected routes return `401` if `Authorization: Bearer <id_token>` is absent or invalid.

---

## 5. Google OAuth Redirect URI

The operator-ui is served from `https://intelligence.rewritelabs.ai` (static files via Cloudflare Pages or the Cloudflare-fronted tunnel).

In **Google Cloud Console → OAuth 2.0 Client → Authorized JavaScript Origins**, add:

```
https://intelligence.rewritelabs.ai
```

In **Authorized redirect URIs** (if using redirect flow — not needed for GSI popup flow):
```
https://intelligence.rewritelabs.ai/oauth2/callback
```

For local dev, also add:
```
http://localhost:8080
```

---

## 6. Environment Variables (production)

Set in Cloudflare Worker KV / Secret Store or server `.env`:

| Variable | Value |
|----------|-------|
| `PORT` | `3000` |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 client ID from Google Cloud Console |
| `ALLOWED_EMAILS` | `sorensencc@gmail.com` (comma-sep operator list) |
| `OPERATOR_UI_ORIGIN` | `https://intelligence.rewritelabs.ai` |
| `CIC_INTELLIGENCE_URL` | internal URL of intelligence-server (e.g. `http://localhost:4000`) |
| `INTELLIGENCE_TOKEN` | shared bearer secret for service-to-service auth |
| `AUTH_DISABLED` | `false` (never `true` in production) |

---

## 7. Serving the Operator UI (static)

Option A — Cloudflare Pages
```bash
# From apps/operator-ui/
wrangler pages deploy . --project-name cic-control-room
```

Option B — Serve via control-plane (Express static)
```js
// Append to apps/control-plane/index.js
app.use(express.static(path.join(__dirname, '../operator-ui')));
```

When serving from Express, set `window.CIC_CONTROL_PLANE_URL` to `''` (same-origin) in a `<script>` tag injected by the worker.

---

## 8. Security Headers (Cloudflare Transform Rules)

Add via **Rules → Transform Rules → Modify Response Headers**:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://accounts.google.com https://apis.google.com;
  frame-src https://accounts.google.com;
  connect-src 'self' https://oauth2.googleapis.com;
  style-src 'self' 'unsafe-inline';

X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=()
```

---

## Post-Validation Checklist

- [ ] `curl https://intelligence.rewritelabs.ai/health` returns 200
- [ ] `curl https://intelligence.rewritelabs.ai/metrics` (no token) returns 401
- [ ] Google Sign-In button renders on `https://intelligence.rewritelabs.ai`
- [ ] After sign-in, metrics + runs panels load with real data
- [ ] Signed-in user email appears in header
- [ ] `X-Correlation-ID` header present in all API responses
- [ ] Direct-to-origin IP returns 403 (Cloudflare IP lock active)
- [ ] Cache-Control: no-store on API routes (verify in DevTools)
