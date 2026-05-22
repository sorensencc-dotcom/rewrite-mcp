#!/usr/bin/env bash
set -e

echo "========================================================"
echo "    CIC Golden-Path E2E Test Harness"
echo "========================================================"

WORKSPACE_ROOT="$(pwd)"
if [[ ! -d "projects/cic" ]]; then
  echo "❌ Please run this script from the rewrite-mcp root directory."
  exit 1
fi

echo "🔄 Starting Control Plane locally for testing..."
cd services/control-plane 2>/dev/null || cd projects/cic/control-plane 2>/dev/null || (echo "Control Plane dir not found" && exit 1)

# Stop any running instances just in case
kill -9 $(lsof -t -i:4000) 2>/dev/null || true

# Start server in background
npm start &
SERVER_PID=$!

echo "⏳ Waiting for server to initialize..."
sleep 5

cd $WORKSPACE_ROOT

echo "🚀 Running E2E Test Suite..."
node tests/pipeline.e2e.test.js
TEST_EXIT_CODE=$?

echo "🛑 Tearing down Control Plane..."
kill $SERVER_PID

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "✅ E2E Harness completed successfully."
else
  echo "❌ E2E Harness failed."
fi

exit $TEST_EXIT_CODE
