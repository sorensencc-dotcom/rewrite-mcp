#!/usr/bin/env bash
# postiz/env.sh — v1.1.0 — 2026-05-16
set -euo pipefail

require_env() {
  [[ -z "${POSTIZ_API_KEY:-}" ]] && { echo "[ERR] POSTIZ_API_KEY not set" >&2; exit 1; }
  [[ -n "${POSTIZ_API_URL:-}" ]] && echo "[INF] POSTIZ_API_URL=${POSTIZ_API_URL}" >&2
}

export_env() {
  local f="${1:-}"
  if [[ -n "$f" ]]; then
    [[ ! -f "$f" ]] && { echo "[ERR] dotenv not found: ${f}" >&2; exit 1; }
    set -o allexport; source "$f"; set +o allexport
  fi
  require_env
}
