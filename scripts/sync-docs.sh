#!/usr/bin/env bash
# scripts/sync-docs.sh - v2.0.0
# Synchronizes project-specific and tool-specific documentation into the reorganized mkdocs directory.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_DIR="$ROOT_DIR/docs"

echo "== [DocSync] Starting Documentation Synchronization (Reorg v2) =="

# 1. Sync Project (CIC) Docs
echo "[DocSync] Syncing CIC Project Docs..."
mkdir -p "$DOCS_DIR/cic"
# Copy all markdown files except CIC_PROJECT_STATE.md and CIC_SYSTEM.md which are deprecated/moved to docs/cic
find "$ROOT_DIR/projects/cic/docs" -maxdepth 1 -name "*.md" ! -name "CIC_PROJECT_STATE.md" ! -name "CIC_SYSTEM.md" -exec cp {} "$DOCS_DIR/cic/" \; 2>/dev/null || echo "[DocSync] Warning: No CIC source docs found."


# 2. Sync Platform Architecture
echo "[DocSync] Syncing Platform Architecture Docs..."
mkdir -p "$DOCS_DIR/rewrite/architecture"
# Control Plane Design
cp "$ROOT_DIR/design/control-plane/README.md" "$DOCS_DIR/rewrite/architecture/control-plane-design.md" 2>/dev/null || echo "[DocSync] Warning: Control Plane design README not found."

# 3. Sync Tool Documentation
echo "[DocSync] Syncing Tool Documentation..."
mkdir -p "$DOCS_DIR/rewrite/tools"
cp "$ROOT_DIR/../tools/runtime-harness/README.md" "$DOCS_DIR/rewrite/tools/runtime-harness.md" 2>/dev/null || echo "[DocSync] Warning: Runtime Harness README not found."
cp "$ROOT_DIR/tools/prompt-telemetry/README.md" "$DOCS_DIR/rewrite/tools/prompt-telemetry.md" 2>/dev/null || echo "[DocSync] Warning: Prompt Telemetry README not found."

# 4. Sync Governance and Skills
echo "[DocSync] Syncing Governance and Skills..."
mkdir -p "$DOCS_DIR/rewrite/governance"
mkdir -p "$DOCS_DIR/rewrite/skills"
cp "$ROOT_DIR/ANTIGRAVITY.md" "$DOCS_DIR/rewrite/governance/ANTIGRAVITY.md" 2>/dev/null || echo "[DocSync] Warning: ANTIGRAVITY.md not found in root."
cp "$ROOT_DIR/skills"/*.md "$DOCS_DIR/rewrite/skills/" 2>/dev/null || echo "[DocSync] Warning: No skills found."

# 5. Build Verification
if [ "${1:-}" == "--build" ]; then
  echo "[DocSync] Running mkdocs build verification..."
  cd "$ROOT_DIR"
  # Attempt to use venv if present
  if [ -d ".venv" ]; then
    .venv/bin/mkdocs build --strict
  else
    mkdocs build --strict
  fi
fi

echo "== [DocSync] Synchronization Complete =="
