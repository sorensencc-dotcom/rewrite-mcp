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

echo "🔄 Starting Control Plane locally for testing on port 4000..."
cd apps/control-plane 2>/dev/null || cd projects/cic/control-plane 2>/dev/null || (echo "Control Plane dir not found" && exit 1)

# Stop any running instances just in case
kill -9 $(lsof -t -i:4000) 2>/dev/null || true

# Start server in background
CP_DIR=$PWD
CIC_INTELLIGENCE_URL=http://localhost:4001 NODE_PATH=$CP_DIR/node_modules PORT=4000 NODE_ENV=test AUTH_DISABLED=true node index.js > /tmp/cp-test.log 2>&1 &
SERVER_PID=$!

echo "⏳ Waiting for server to initialize..."
sleep 10

if ! lsof -i:4000 > /dev/null; then
  echo "❌ Control Plane failed to start on port 4000. Logs:"
  cat /tmp/cp-test.log
  exit 1
fi

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
