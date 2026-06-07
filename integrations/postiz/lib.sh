#!/usr/bin/env bash
# postiz/lib.sh — v1.1.0 — 2026-05-16
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"

upload_media() {
  local f="${1:?file required}"
  [[ ! -f "$f" ]] && { echo "[ERR] not found: ${f}" >&2; exit 1; }
  local r; r=$(postiz upload "$f") || { echo "[ERR] upload failed: ${f}" >&2; exit 1; }
  local p; p=$(echo "$r" | jq -r '.path // empty')
  [[ -z "$p" ]] && { echo "[ERR] no .path in upload response" >&2; exit 1; }
  echo "$p"
}

retry_post() {
  local max="$1"; shift; local i=1
  while (( i <= max )); do
    "$@" && return 0
    echo "[WRN] attempt ${i}/${max} failed, sleep $((2**i))s" >&2
    sleep $((2**i)); (( i++ )) || true
  done
  echo "[ERR] all ${max} attempts failed" >&2; return 1
}

require_integration() {
  local n; n=$(postiz integrations:list 2>/dev/null | jq 'length' 2>/dev/null || echo 0)
  (( n > 0 )) || { echo "[ERR] no integrations found" >&2; exit 1; }
}
