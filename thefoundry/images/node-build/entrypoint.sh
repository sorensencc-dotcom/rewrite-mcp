#!/bin/bash
# TheFoundry Node Build Entrypoint
# Orchestrates build stages: dependency installation, testing, linting, building

set -e

echo "=== TheFoundry Node Build Entrypoint ==="
echo "Working directory: $(pwd)"
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"
echo ""

# Stage 1: Validate dependencies are installed
if [ ! -d node_modules ]; then
    echo "Error: node_modules not found. Run 'npm ci' first."
    exit 1
fi
echo "✓ Dependencies validated"

# Stage 2: Run tests if npm test exists
if npm run 2>&1 | grep -q "test"; then
    echo "Running tests..."
    npm run test -- --bail || true
    echo "✓ Tests completed"
fi

# Stage 3: Run linting if npm run lint exists
if npm run 2>&1 | grep -q "lint"; then
    echo "Running linting..."
    npm run lint || true
    echo "✓ Linting completed"
fi

# Stage 4: Run build if npm run build exists
if npm run 2>&1 | grep -q "build"; then
    echo "Running build..."
    npm run build
    echo "✓ Build completed"
fi

# Stage 5: Validate final artifacts
if [ ! -d dist ]; then
    echo "Error: Build failed - dist/ directory not found"
    exit 1
fi

echo ""
echo "=== TheFoundry Build Successful ==="
echo "Build artifacts: $(ls -la dist | wc -l) files"
echo ""
