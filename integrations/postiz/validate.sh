#!/usr/bin/env bash
# postiz/validate.sh — v1.1.0 — 2026-05-16
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
require_env

SKIP_MEDIA=false; [[ "${1:-}" == "--skip-media" ]] && SKIP_MEDIA=true
P=0; F=0
ok()  { echo "[PASS] $1"; (( P++ )) || true; }
bad() { echo "[FAIL] $1"; (( F++ )) || true; }
chk() { local l="$1"; shift; "$@" &>/dev/null && ok "$l" || bad "$l"; }

chk "postiz --help"              postiz --help
chk "postiz posts:create --help" postiz posts:create --help

N=$(postiz integrations:list 2>/dev/null | jq 'length' 2>/dev/null || echo 0)
(( N > 0 )) && ok "integrations:list ≥1 (found: ${N})" || bad "integrations:list ≥1"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/campaigns"
for f in "$DIR"/*.json; do
  [[ -f "$f" ]] || continue
  jq empty "$f" &>/dev/null && ok "JSON: $(basename "$f")" || bad "JSON: $(basename "$f")"
done

if [[ "$SKIP_MEDIA" == false ]]; then
  read -r -p "test image path (or 'skip'): " IMG
  if [[ "$IMG" != skip && -n "$IMG" ]]; then
    read -r -p "integration-id: " INT
    MPATH=$(upload_media "$IMG" 2>/dev/null) || MPATH=""
    if [[ -n "$MPATH" && -n "$INT" ]]; then
      TS=$(date -u -d '+10 minutes' '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || \
           python3 -c "from datetime import datetime,timedelta; \
             print((datetime.utcnow()+timedelta(minutes=10)).strftime('%Y-%m-%dT%H:%M:%SZ'))")
      chk "upload→create draft" \
        postiz posts:create -c "[validate dry-run]" -s "$TS" -t draft -m "$MPATH" -i "$INT"
    else
      bad "upload→create draft (upload failed or no INT)"
    fi
  fi
fi

echo ""; echo "PASS:${P}  FAIL:${F}"
(( F == 0 )) && exit 0 || exit 1
