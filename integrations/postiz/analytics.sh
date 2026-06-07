#!/usr/bin/env bash
# postiz/analytics.sh — v1.1.0 — 2026-05-16
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
require_env

MODE="${1:?Usage: analytics.sh <platform|post> <id> [days]}"
TARGET="${2:?target id required}"
DAYS="${3:-30}"
[[ "$DAYS" =~ ^[1-9][0-9]*$ ]] || { echo "[ERR] days must be a positive int" >&2; exit 1; }

case "$MODE" in
  platform)
    postiz analytics:platform "$TARGET" -d "$DAYS"
    ;;
  post)
    RESULT=$(postiz analytics:post "$TARGET" -d "$DAYS")
    echo "$RESULT"
    if [[ "$(echo "$RESULT" | jq -r '.missing // false')" == "true" ]]; then
      postiz posts:missing "$TARGET"
      read -r -p "release-id: " RID
      [[ -n "$RID" ]] || { echo "[ERR] no release-id provided" >&2; exit 1; }
      postiz posts:connect "$TARGET" --release-id "$RID"
      postiz analytics:post "$TARGET" -d "$DAYS"
    fi
    ;;
  *)
    echo "[ERR] unknown mode: ${MODE} (use platform|post)" >&2; exit 1
    ;;
esac
