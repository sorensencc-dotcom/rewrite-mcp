#!/usr/bin/env bash
# postiz/campaign.sh — v1.1.0 — 2026-05-16
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
require_env

F="${1:?Usage: campaign.sh <campaign.json>}"
[[ -f "$F" ]]                      || { echo "[ERR] not found: ${F}" >&2;    exit 1; }
jq empty "$F" 2>/dev/null          || { echo "[ERR] invalid JSON: ${F}" >&2; exit 1; }

for k in integrations posts; do
  jq -e ".${k} | length > 0" "$F" > /dev/null 2>&1 \
    || { echo "[ERR] empty or missing: .${k}" >&2; exit 1; }
done

retry_post 3 postiz posts:create --json "$F"
