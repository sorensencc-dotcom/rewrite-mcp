#!/usr/bin/env bash
# postiz/post.sh — v1.1.0 — 2026-05-16
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
require_env

C=(); S=""; I=""; M=(); T="published"; D=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -c) C+=("$2"); shift 2 ;;
    -s) S="$2";    shift 2 ;;
    -i) I="$2";    shift 2 ;;
    -m) M+=("$2"); shift 2 ;;
    -t) T="$2";    shift 2 ;;
    -d) D="$2";    shift 2 ;;
    *)  echo "[ERR] unknown flag: $1" >&2; exit 1 ;;
  esac
done

(( ${#C[@]} ))              || { echo "[ERR] -c required" >&2;                    exit 1; }
[[ -n "$S" ]]               || { echo "[ERR] -s (ISO 8601) required" >&2;         exit 1; }
[[ -n "$I" ]]               || { echo "[ERR] -i (integration-id) required" >&2;  exit 1; }
[[ "$T" =~ ^(published|draft)$ ]] || { echo "[ERR] -t must be published|draft" >&2; exit 1; }
echo "$S" | grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' || { echo "[ERR] -s not ISO 8601" >&2; exit 1; }

ARGS=()
for c in "${C[@]}"; do ARGS+=(-c "$c"); done
ARGS+=(-s "$S" -i "$I" -t "$T")
for m in "${M[@]}"; do ARGS+=(-m "$m"); done
[[ -n "$D" ]] && ARGS+=(-d "$D")

retry_post 3 postiz posts:create "${ARGS[@]}"
