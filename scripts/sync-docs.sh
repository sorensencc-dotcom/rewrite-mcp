#!/usr/bin/env bash
# scripts/sync-docs.sh - v1.0.0
# Synchronizes project-specific and tool-specific documentation into the main mkdocs directory.

set -euo pipefail

ROOT_DIR="/mnt/c/dev/rewrite-mcp"
DOCS_DIR="$ROOT_DIR/docs"

echo "== [DocSync] Starting Documentation Synchronization =="

# 1. Sync Project (CIC) Docs
echo "[DocSync] Syncing CIC Project Docs..."
mkdir -p "$DOCS_DIR/projects/cic"
cp "$ROOT_DIR/projects/cic/docs"/*.md "$DOCS_DIR/projects/cic/" 2>/dev/null || echo "[DocSync] Warning: No CIC docs found."

# 2. Sync Tool READMEs
echo "[DocSync] Syncing Tool READMEs..."
mkdir -p "$DOCS_DIR/tools"
cp "/mnt/c/dev/tools/runtime-harness/README.md" "$DOCS_DIR/tools/runtime-harness.md" 2>/dev/null || echo "[DocSync] Warning: Runtime Harness README not found."
cp "$ROOT_DIR/tools/prompt-telemetry/README.md" "$DOCS_DIR/tools/prompt-telemetry.md" 2>/dev/null || echo "[DocSync] Warning: Prompt Telemetry README not found."

# 3. Sync Foundational Mandate and Skills
echo "[DocSync] Syncing ANTIGRAVITY.md and Skills..."
cp "$ROOT_DIR/ANTIGRAVITY.md" "$DOCS_DIR/ANTIGRAVITY.md" 2>/dev/null || echo "[DocSync] Warning: ANTIGRAVITY.md not found."
mkdir -p "$DOCS_DIR/skills"
cp "$ROOT_DIR/skills"/*.md "$DOCS_DIR/skills/" 2>/dev/null || echo "[DocSync] Warning: No skills found."

# 3.2 Fix Relative Links for MkDocs
echo "[DocSync] Fixing relative links for MkDocs..."
# In docs/ANTIGRAVITY.md: docs/DOC_POLICY.md -> DOC_POLICY.md
sed -i 's|docs/DOC_POLICY.md|DOC_POLICY.md|g' "$DOCS_DIR/ANTIGRAVITY.md"
sed -i 's|docs/ROADMAP.md|ROADMAP.md|g' "$DOCS_DIR/ANTIGRAVITY.md"
# In docs/DOC_POLICY.md and docs/ROADMAP.md: ../skills/doc-update.md -> skills/doc-update.md
sed -i 's|../skills/doc-update.md|skills/doc-update.md|g' "$DOCS_DIR/DOC_POLICY.md"
sed -i 's|../skills/doc-update.md|skills/doc-update.md|g' "$DOCS_DIR/ROADMAP.md"
# In docs/skills/doc-update.md: ../docs/DOC_POLICY.md -> ../DOC_POLICY.md
sed -i 's|../docs/DOC_POLICY.md|../DOC_POLICY.md|g' "$DOCS_DIR/skills/doc-update.md"

# 3.1 Sync Control Plane Design Docs
echo "[DocSync] Syncing Control Plane Design Docs..."
mkdir -p "$DOCS_DIR/architecture"
cp "/mnt/c/dev/CIP/RewriteLabs/rewrite-mcp/design/control-plane/README.md" "$DOCS_DIR/architecture/control-plane-design.md" 2>/dev/null || echo "[DocSync] Warning: Control Plane design README not found."

# 4. Sync Migration and Release Notes (Ensuring they are in docs root for mkdocs)
echo "[DocSync] Syncing Migration, Release Notes, and Manuals..."
mkdir -p "$DOCS_DIR/migrations"
mkdir -p "$DOCS_DIR/releases"
mkdir -p "$DOCS_DIR/readiness"
mkdir -p "$DOCS_DIR/manuals"

# 5. Build Verification (Optional but recommended)
if [ "${1:-}" == "--build" ]; then
  echo "[DocSync] Running mkdocs build verification..."
  cd "$ROOT_DIR"
  .venv/bin/mkdocs build --strict
fi

echo "== [DocSync] Synchronization Complete =="
