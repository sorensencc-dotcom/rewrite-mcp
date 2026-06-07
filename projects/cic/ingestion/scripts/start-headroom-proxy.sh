#!/usr/bin/env bash
set -euo pipefail

PORT="${HEADROOM_PROXY_PORT:-8787}"
MEMORY_FLAG="${HEADROOM_MEMORY_FLAG:---memory}"
CODE_GRAPH_FLAG="${HEADROOM_CODE_GRAPH_FLAG:---code-graph}"

echo "[headroom] starting proxy on port ${PORT}..."
headroom proxy \
  --port "${PORT}" \
  ${MEMORY_FLAG} \
  ${CODE_GRAPH_FLAG}
