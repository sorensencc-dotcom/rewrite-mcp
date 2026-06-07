# postiz/ — v1.1.0 — 2026-05-16
# BOB_POSTIZ_INTEGRATION_v1 — CIC + Rewrite Labs social scheduling

---

## Prerequisites

| Requirement | Check |
|---|---|
| `postiz` binary on PATH | `postiz --help` |
| `jq` on PATH | `jq --version` |
| `POSTIZ_API_KEY` exported | see Setup |

---

## Setup

```bash
export POSTIZ_API_KEY=your_api_key_here
export POSTIZ_API_URL=https://custom-url.com   # optional
```

Or source a dotenv file:

```bash
source env.sh
export_env /path/to/.env.postiz
```

---

## File Map

```
postiz/
  env.sh              require_env / export_env
  lib.sh              upload_media / retry_post / require_integration
  post.sh             posts:create wrapper (flag parsing + retry)
  campaign.sh         JSON campaign runner (validation + retry)
  analytics.sh        analytics:platform | analytics:post + missing resolution
  validate.sh         POST_VALIDATION runner (BOB spec checks 1–5)
  campaigns/
    cic-campaign.json   Cast Iron Charlie — LinkedIn / Twitter / Facebook
    rl-campaign.json    Rewrite Labs — LinkedIn / Twitter
```

---

## env.sh

```bash
# Source only — do not execute directly.
source env.sh

require_env                        # exits if POSTIZ_API_KEY unset
export_env /path/to/.env.postiz   # sources file, then calls require_env
```

---

## lib.sh

Sourced automatically by all other scripts. Three functions:

```bash
upload_media <file>              # → echoes remote path to stdout
retry_post <max> <cmd...>        # → runs cmd up to max times (2^n backoff)
require_integration              # → exits if integrations:list returns 0
```

**Media rule:** always upload before use. Never pass local paths to `-m`.

```bash
source lib.sh
MPATH=$(upload_media ./hero.png)
```

---

## post.sh

Single post or thread. All flags map directly to `postiz posts:create`.

```
Flags:
  -c  Content string        (repeatable — each -c = one thread post)
  -s  ISO 8601 schedule     (required)
  -i  Integration ID        (required)
  -m  Remote media path     (repeatable, from upload_media)
  -t  published | draft     (default: published)
  -d  Delay minutes         (between thread posts)
```

```bash
# Simple post
bash post.sh \
  -c "Content here" \
  -s "2026-06-01T12:00:00Z" \
  -i "twitter-abc123"

# Draft with media
MPATH=$(source lib.sh; upload_media ./image.png)
bash post.sh \
  -c "Content" \
  -s "2026-06-01T12:00:00Z" \
  -i "linkedin-xyz456" \
  -m "$MPATH" \
  -t draft

# Thread (3 posts, 5-min delay)
bash post.sh \
  -c "Main post" \
  -c "First reply" \
  -c "Second reply" \
  -s "2026-06-01T12:00:00Z" \
  -d 5 \
  -i "twitter-abc123"
```

---

## campaign.sh

Runs a multi-platform JSON campaign file.

```bash
bash campaign.sh campaigns/cic-campaign.json
bash campaign.sh campaigns/rl-campaign.json
```

**Before running:** replace `REPLACE_*` integration IDs in the JSON.  
**Media:** populate `"image": []` arrays with paths from `upload_media`.

---

## Campaign JSON Schema

```json
{
  "_meta": { ... },
  "integrations": ["integration-id-1", "integration-id-2"],
  "posts": [
    {
      "provider": "twitter",
      "post": [
        { "content": "...", "image": ["remote-path-or-empty"] }
      ]
    }
  ]
}
```

Get integration IDs:

```bash
postiz integrations:list
```

Valid `provider` values depend on your connected integrations (twitter, linkedin, facebook, instagram, etc.).

---

## analytics.sh

```bash
# Platform-level analytics (30-day default)
bash analytics.sh platform <integration-id>
bash analytics.sh platform <integration-id> 60

# Post-level analytics
bash analytics.sh post <post-id>
bash analytics.sh post <post-id> 14
```

If `analytics:post` returns `{"missing": true}`, the script automatically:
1. Runs `postiz posts:missing <post-id>`
2. Prompts for a release ID
3. Runs `postiz posts:connect <post-id> --release-id <id>`
4. Re-fetches analytics

---

## validate.sh

Runs all BOB POST_VALIDATION checks.

```bash
bash validate.sh              # interactive (includes media upload check)
bash validate.sh --skip-media # CI / non-interactive
```

Checks:
1. `postiz --help` responds
2. `postiz posts:create --help` responds
3. `integrations:list` returns ≥1 integration
4. All `campaigns/*.json` files are valid JSON
5. Upload → path → draft post end-to-end (interactive only)

---

## Discovery

```bash
# List integrations + IDs
postiz integrations:list

# Get settings schema for an integration
postiz integrations:settings <integration-id>

# Trigger dynamic data (flairs, playlists, company pages)
postiz integrations:trigger <integration-id> <method> -d '{"param":"value"}'
```

---

## Error / Retry Contract

All `posts:create` calls go through `retry_post 3`. Backoff: 2s → 4s → 8s.  
On final failure, the script exits non-zero and logs `[ERR] all 3 attempts failed`.

---

## Projects

| Campaign file | Project | Platforms |
|---|---|---|
| `campaigns/cic-campaign.json` | Cast Iron Charlie documentary | LinkedIn, Twitter, Facebook |
| `campaigns/rl-campaign.json` | Rewrite Labs redesign outreach | LinkedIn, Twitter |
