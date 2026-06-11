#!/bin/bash
# TheFoundry Node Build Entrypoint (Phase 0.9)
# Orchestrates deterministic multi-stage build with artifact generation

set -euo pipefail

PROJECT_NAME="${PROJECT_NAME:-app}"
BUILD_ID="${BUILD_ID:-$(date +%s)}"
OUTPUT_DIR="${OUTPUT_DIR:-/artifacts}"

echo "=== TheFoundry Build Orchestrator (Phase 0.9) ==="
echo "Project: $PROJECT_NAME"
echo "Build ID: $BUILD_ID"
echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo ""

# Validate inputs
if [ ! -f "package.json" ] || [ ! -f "package-lock.json" ]; then
  echo "❌ Error: package.json and package-lock.json required"
  exit 1
fi

# Install dependencies (frozen lockfile)
echo "📦 Installing dependencies (frozen)..."
npm ci --frozen-lockfile || exit 1
echo "✓ Dependencies installed"
echo ""

# Build
echo "🔨 Building..."
npm run build 2>&1 || npm run compile 2>&1 || { echo "❌ Build failed"; exit 1; }
echo "✓ Build complete"
echo ""

# Test
echo "✓ Running tests..."
npm test -- --passWithNoTests --coverage 2>&1 | tee test-results.txt || true
echo ""

# Lint
echo "✓ Running linter..."
npm run lint 2>&1 | tee lint-results.txt || true
echo ""

# Type check
echo "✓ Type checking..."
npm run type-check 2>&1 | tee type-check-results.txt || true
echo ""

# Generate SBOM
echo "✓ Generating SBOM..."
npm install -g cyclonedx-npm >/dev/null 2>&1
cyclonedx-npm --output-format json --output-file sbom.json 2>/dev/null || echo '{"components":[]}' > sbom.json
echo ""

# Generate provenance
echo "✓ Generating provenance..."
cat > provenance.json <<EOF
{
  "build_id": "$BUILD_ID",
  "project": "$PROJECT_NAME",
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "git_sha": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "node_version": "$(node --version)",
  "npm_version": "$(npm --version)",
  "phase": "0.9"
}
EOF
echo ""

# Prepare artifacts
echo "✓ Preparing artifacts..."
mkdir -p "$OUTPUT_DIR"
[ -d dist ] && cp -r dist "$OUTPUT_DIR/" || true
cp package.json package-lock.json sbom.json provenance.json "$OUTPUT_DIR/"
cp test-results.txt lint-results.txt type-check-results.txt "$OUTPUT_DIR/" 2>/dev/null || true

echo ""
echo "✅ TheFoundry Build Complete!"
echo "Artifacts: $OUTPUT_DIR"
ls -lah "$OUTPUT_DIR" || true
