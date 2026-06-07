@echo off
REM APPLY-RUNTIME-PATCHES.bat
REM Windows batch version - apply CIC AI Runtime v1.0.0 patches
REM Usage: APPLY-RUNTIME-PATCHES.bat (run from rewrite-mcp root)

setlocal enabledelayedexpansion

echo.
echo ================================================================
echo CIC AI Runtime v1.0.0 - Five-Commit Installation (Windows)
echo ================================================================
echo.

REM Check if we're in a git repo
if not exist ".git" (
  echo ERROR: Not in a git repository. Run from C:\dev\rewrite-mcp root.
  exit /b 1
)

set BRANCH=feat/runtime-install-v1

REM Create feature branch if it doesn't exist
git rev-parse --verify %BRANCH% >nul 2>&1
if %errorlevel% equ 0 (
  echo Branch %BRANCH% already exists. Checking it out...
  git checkout %BRANCH%
) else (
  echo Creating feature branch: %BRANCH%
  git checkout -b %BRANCH%
)

echo.
echo ================================================================
echo [1/5] Contract Loader
echo ================================================================
if not exist "src\runtime" mkdir src\runtime
copy 01-contract-loader.ts src\runtime\contract-loader.ts >nul
git add src\runtime\contract-loader.ts
git commit -m "runtime: add CIC AI Runtime contract loader (src/runtime/contract-loader.ts)" -m "- Adds loader to locate and parse projects/cic/docs/CIC_AI_RUNTIME_CONTRACT.md" -m "- Exposes loadRuntimeContract and requireContractVersion APIs" -m "- Fails fast when contract is missing or unparsable"

echo.
echo ================================================================
echo [2/5] RTK Startup Contract Load
echo ================================================================
if not exist "src\rtk\index.ts" (
  echo ERROR: src\rtk\index.ts not found
  exit /b 1
)
type 02-rtk-patch.ts >> src\rtk\index.ts
git add src\rtk\index.ts
git commit -m "rtk: load and validate CIC AI Runtime Contract at startup" -m "- RTK loads contract via contract-loader on bootstrap" -m "- Logs contract path and version" -m "- Fails fast if contract missing/unparsable" -m "- Optional version pinning commented for operator use"

echo.
echo ================================================================
echo [3/5] RRK Goal Validation
echo ================================================================
if not exist "src\rrk\index.ts" (
  echo ERROR: src\rrk\index.ts not found
  exit /b 1
)
type 03-rrk-patch.ts >> src\rrk\index.ts
git add src\rrk\index.ts
git commit -m "rrk: import runtime contract and validate goal emission" -m "- Loads contract at RRK startup" -m "- Adds validateRRKGoal to enforce allowed goal types and required fields" -m "- Prevents RRK from emitting goals without contract guidance"

echo.
echo ================================================================
echo [4/5] git-ai Governance Delta Validation
echo ================================================================
if not exist "src\gita\governance.ts" (
  echo ERROR: src\gita\governance.ts not found
  exit /b 1
)
type 04-gita-patch.ts >> src\gita\governance.ts
git add src\gita\governance.ts
git commit -m "git-ai: load runtime contract and validate governance deltas" -m "- Loads contract at git-ai startup" -m "- Adds validateGovernanceDelta to enforce required fields and semver checks" -m "- Throws descriptive errors for malformed governance payloads"

echo.
echo ================================================================
echo [5/5] CIC Control Plane Contract Acknowledgement
echo ================================================================
if not exist "src\cic\control-plane" mkdir src\cic\control-plane
copy 05-contract-ack.ts src\cic\control-plane\contract-ack.ts >nul

if not exist "src\cic\index.ts" (
  echo ERROR: src\cic\index.ts not found
  exit /b 1
)
type 06-cic-patch.ts >> src\cic\index.ts

git add src\cic\control-plane\contract-ack.ts src\cic\index.ts
git commit -m "cic: acknowledge runtime contract and expose version to control plane" -m "- Adds contract-ack module to load and acknowledge contract" -m "- Registers runtime_contract info with dashboard health registry" -m "- Fails fast if contract missing/unparsable"

echo.
echo ================================================================
echo INSTALLATION COMPLETE
echo ================================================================
echo.
git log --oneline -5
echo.
echo Next steps:
echo   1. git push origin %BRANCH%
echo   2. Open PR on GitHub
echo   3. Copy PR_BODY.md content into PR description
echo   4. Verify CI and smoke tests pass
echo   5. Merge to main
echo   6. Tag release: git tag -a v1.0.0 -m "..."
echo.
