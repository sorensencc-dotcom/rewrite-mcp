#!/bin/bash
# APPLY-RUNTIME-PATCHES.sh
# Apply five commits for CIC AI Runtime v1.0.0 installation
# Usage: cd /path/to/rewrite-mcp && bash APPLY-RUNTIME-PATCHES.sh

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CIC AI Runtime v1.0.0 — Five-Commit Installation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

REPO_ROOT=$(pwd)
BRANCH="feat/runtime-install-v1"

# Check if we're in a git repo
if [ ! -d ".git" ]; then
  echo "ERROR: Not in a git repository. Run this script from the rewrite-mcp root."
  exit 1
fi

# Create feature branch if it doesn't exist
if git rev-parse --verify $BRANCH 2>/dev/null; then
  echo "Branch $BRANCH already exists. Checking it out..."
  git checkout $BRANCH
else
  echo "Creating feature branch: $BRANCH"
  git checkout -b $BRANCH
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[1/5] Contract Loader"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

mkdir -p src/runtime
cp 01-contract-loader.ts src/runtime/contract-loader.ts
git add src/runtime/contract-loader.ts
git commit -m "runtime: add CIC AI Runtime contract loader (src/runtime/contract-loader.ts)

- Adds loader to locate and parse projects/cic/docs/CIC_AI_RUNTIME_CONTRACT.md
- Exposes loadRuntimeContract and requireContractVersion APIs
- Fails fast when contract is missing or unparsable"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[2/5] RTK Startup Contract Load"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -f "src/rtk/index.ts" ]; then
  echo "ERROR: src/rtk/index.ts not found"
  exit 1
fi
cat 02-rtk-patch.ts >> src/rtk/index.ts
git add src/rtk/index.ts
git commit -m "rtk: load and validate CIC AI Runtime Contract at startup

- RTK loads contract via contract-loader on bootstrap
- Logs contract path and version
- Fails fast if contract missing/unparsable
- Optional version pinning commented for operator use"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[3/5] RRK Goal Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -f "src/rrk/index.ts" ]; then
  echo "ERROR: src/rrk/index.ts not found"
  exit 1
fi
cat 03-rrk-patch.ts >> src/rrk/index.ts
git add src/rrk/index.ts
git commit -m "rrk: import runtime contract and validate goal emission

- Loads contract at RRK startup
- Adds validateRRKGoal to enforce allowed goal types and required fields
- Prevents RRK from emitting goals without contract guidance"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[4/5] git-ai Governance Delta Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -f "src/gita/governance.ts" ]; then
  echo "ERROR: src/gita/governance.ts not found"
  exit 1
fi
cat 04-gita-patch.ts >> src/gita/governance.ts
git add src/gita/governance.ts
git commit -m "git-ai: load runtime contract and validate governance deltas

- Loads contract at git-ai startup
- Adds validateGovernanceDelta to enforce required fields and semver checks
- Throws descriptive errors for malformed governance payloads"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[5/5] CIC Control Plane Contract Acknowledgement"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

mkdir -p src/cic/control-plane
cp 05-contract-ack.ts src/cic/control-plane/contract-ack.ts

if [ ! -f "src/cic/index.ts" ]; then
  echo "ERROR: src/cic/index.ts not found"
  exit 1
fi
cat 06-cic-patch.ts >> src/cic/index.ts

git add src/cic/control-plane/contract-ack.ts src/cic/index.ts
git commit -m "cic: acknowledge runtime contract and expose version to control plane

- Adds contract-ack module to load and acknowledge contract
- Registers runtime_contract info with dashboard health registry
- Fails fast if contract missing/unparsable"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Installation Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
git log --oneline -5
echo ""
echo "Next steps:"
echo "  1. Push branch: git push origin $BRANCH"
echo "  2. Open PR with the checklist from PR_BODY.md"
echo "  3. Verify CI and smoke tests pass"
echo "  4. Merge to main"
echo "  5. Tag release: git tag -a v1.0.0 -m '...'"
echo ""
