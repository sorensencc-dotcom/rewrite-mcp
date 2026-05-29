# CIC AI Runtime v1.0.0 — Installation Package

**Date:** 2026-05-29  
**Status:** Ready to apply  
**Destination:** `/path/to/rewrite-mcp`

## What You Have

This package contains everything needed to install the CIC AI Runtime v1.0.0 contract loader and agent integration patches:

```
01-contract-loader.ts              ← src/runtime/contract-loader.ts
02-rtk-patch.ts                    ← append to src/rtk/index.ts
03-rrk-patch.ts                    ← append to src/rrk/index.ts
04-gita-patch.ts                   ← append to src/gita/governance.ts
05-contract-ack.ts                 ← src/cic/control-plane/contract-ack.ts
06-cic-patch.ts                    ← append to src/cic/index.ts
APPLY-RUNTIME-PATCHES.sh           ← Automated commit script
PR_BODY.md                         ← Copy into your PR description
validate-runtime-contract.yml      ← Place in .github/workflows/
README-RUNTIME-INSTALL.md          ← This file
```

## Quick Start

### Step 1: Copy This Package to Your Repo Root

```bash
cd /path/to/rewrite-mcp
cp -r /path/to/outputs/* .
```

### Step 2: Run the Installation Script

The script creates all five commits automatically:

```bash
bash APPLY-RUNTIME-PATCHES.sh
```

**What it does:**
- Creates feature branch `feat/runtime-install-v1` (or uses existing)
- Copies all patch files into the right locations
- Commits each change with proper commit messages
- Shows final commit log

**Expected output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CIC AI Runtime v1.0.0 — Five-Commit Installation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1/5] Contract Loader
[2/5] RTK Startup Contract Load
[3/5] RRK Goal Validation
[4/5] git-ai Governance Delta Validation
[5/5] CIC Control Plane Contract Acknowledgement

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Installation Complete
```

### Step 3: Verify the Commits

```bash
git log --oneline -5
```

You should see all five commits:
```
abc1234 cic: acknowledge runtime contract and expose version to control plane
abc1235 git-ai: load runtime contract and validate governance deltas
abc1236 rrk: import runtime contract and validate goal emission
abc1237 rtk: load and validate CIC AI Runtime Contract at startup
abc1238 runtime: add CIC AI Runtime contract loader (src/runtime/contract-loader.ts)
```

### Step 4: Set Up GitHub Actions CI

```bash
mkdir -p .github/workflows
cp validate-runtime-contract.yml .github/workflows/
git add .github/workflows/validate-runtime-contract.yml
git commit -m "ci: add CIC AI Runtime contract validation workflow"
```

### Step 5: Create and Push Feature Branch

```bash
git push origin feat/runtime-install-v1
```

### Step 6: Open PR with Merge Gate Checklist

1. Go to GitHub and open a PR from `feat/runtime-install-v1` → `main`
2. Copy the content of `PR_BODY.md` into the PR description
3. The PR description includes the merge gate checklist
4. Wait for CI to run and verify the contract validation passes

## Merge Gate Verification

The PR includes a detailed checklist. Before merging, verify:

✓ **Files and Placement**
- `projects/cic/docs/CIC_AI_RUNTIME_CONTRACT.md` exists
- All five source files are committed

✓ **Build and Tests**
- `npm ci` passes
- `npm test` passes
- No new linting errors

✓ **Runtime Activation** (run in dev environment)
- Start RTK: should log `[RTK] Loaded CIC AI Runtime Contract v1.0.0`
- Start RRK: should log `[RRK] CIC AI Runtime Contract v1.0.0 loaded`
- Start git-ai: should log `[git-ai] Loaded CIC AI Runtime Contract v1.0.0`
- Start CIC: should log `[CIC] Acknowledged CIC AI Runtime Contract v1.0.0 at ...`

## Rollback Plan

If anything goes wrong during installation:

```bash
# Revert to the commit before the first runtime patch
git revert <first-commit-hash>

# Or, start over on a fresh branch
git checkout -b feat/runtime-install-v1-retry main
bash APPLY-RUNTIME-PATCHES.sh
```

## Files Reference

| File | Purpose | Destination |
|------|---------|-------------|
| `01-contract-loader.ts` | Loader module | `src/runtime/contract-loader.ts` |
| `02-rtk-patch.ts` | RTK integration | Appended to `src/rtk/index.ts` |
| `03-rrk-patch.ts` | RRK integration | Appended to `src/rrk/index.ts` |
| `04-gita-patch.ts` | git-ai integration | Appended to `src/gita/governance.ts` |
| `05-contract-ack.ts` | CIC contract ack | `src/cic/control-plane/contract-ack.ts` |
| `06-cic-patch.ts` | CIC integration | Appended to `src/cic/index.ts` |
| `APPLY-RUNTIME-PATCHES.sh` | Automation script | Run from repo root |
| `PR_BODY.md` | PR description | Copy into GitHub PR |
| `validate-runtime-contract.yml` | CI workflow | `.github/workflows/` |

## Troubleshooting

### Script fails with "File not found"
Ensure you're running the script from the rewrite-mcp repo root:
```bash
cd /path/to/rewrite-mcp && bash APPLY-RUNTIME-PATCHES.sh
```

### Git lock conflicts
If you see `.git/index.lock` errors, wait a moment and retry:
```bash
sleep 2 && bash APPLY-RUNTIME-PATCHES.sh
```

### Files already exist
The script overwrites existing files. Back up before running if needed:
```bash
git stash && bash APPLY-RUNTIME-PATCHES.sh
```

## Post-Installation

After merging to `main`, tag the release:

```bash
git checkout main
git pull
git tag -a v1.0.0 -m "CIC-AI Runtime v1.0.0 — Contract Loader, Multi-Agent Integration, CI Validation"
git push origin v1.0.0
```

---

**Questions?** Review the five commits one by one or check the PR_BODY.md checklist.
