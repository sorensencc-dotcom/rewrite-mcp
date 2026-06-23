# ImageAnalyzerV2 Deployment Guide

**Version:** 1.0.0  
**Date:** 2026-06-22  
**Status:** Ready for Deployment

---

## Quick Start

### Windows Users

```batch
# 1. Open Command Prompt and navigate to outputs folder
cd C:\Users\soren\AppData\Roaming\Claude\local-agent-mode-sessions\de3b53f4-cead-4497-ab62-b7aa13f73d25\cb5a7ad7-52ca-4f55-8bf5-016d22440e98\local_be4537f4-c0d2-49b8-9468-903932ce9663\outputs

# 2. DRY-RUN (preview without changes)
deploy.bat "C:\path\to\your\repo" --dry-run

# 3. EXECUTE (copy all files)
deploy.bat "C:\path\to\your\repo"
```

### macOS/Linux Users

```bash
# 1. Navigate to outputs folder
cd /path/to/outputs

# 2. Make script executable
chmod +x deploy.sh

# 3. DRY-RUN (preview without changes)
./deploy.sh /path/to/your/repo --dry-run

# 4. EXECUTE (copy all files)
./deploy.sh /path/to/your/repo
```

---

## What The Deployment Script Does

The deployment script automates the following:

1. **Validates paths** — Checks source and target directories exist
2. **Creates folder structure** — `src/cic/analyzers/image/v2/` with `__tests__/` subdirectory
3. **Copies code files** — All 5 TypeScript implementation files
4. **Copies test files** — Both Tier-1 and Tier-2 test suites
5. **Copies documentation** — 3 comprehensive guides
6. **Generates support files** — IMPORT_PATHS.md and DEPLOYMENT_SUMMARY.md
7. **Validates deployment** — Checks all files are in place

**Total:** 10 files deployed in ~2 seconds

---

## File Manifest

### Code Files (copied to `src/cic/analyzers/image/v2/`)

```
src/cic/analyzers/image/v2/
├── imageAnalyzerV2Adapter.ts              [Core adapter, 8.2 KB]
├── imageAnalyzerV2RoutingPolicy.ts        [Routing logic, 3.2 KB]
├── localImageExtractor.ts                 [GPU integration, 7.3 KB]
├── remoteImageExtractor.ts                [Gemini Vision API, 11 KB]
├── types.ts                               [Type definitions, 3.2 KB]
└── __tests__/
    ├── imageAnalyzerV2Adapter.test.ts     [Unit tests, 9.2 KB]
    └── imageAnalyzerV2-integration.test.ts [Integration tests, 20 KB]
```

### Documentation (copied to `docs/analyzers/image/v2/`)

```
docs/analyzers/image/v2/
├── INTEGRATION_PLAN.md                    [Integration steps, 11 KB]
├── PHASE_28_WARMPOOL_TUNING.md            [Warm-pool config, 23 KB]
└── README.md                              [Master guide, 13 KB]
```

### Support Files (generated during deployment)

```
src/cic/analyzers/image/v2/
├── IMPORT_PATHS.md                        [Import path mapping]
└── DEPLOYMENT_SUMMARY.md                  [Deployment log]
```

---

## Step-by-Step Deployment

### Phase 1: Pre-Deployment

**1. Verify repository path**

```bash
# Windows
dir C:\path\to\your\repo\src

# Linux/macOS
ls -la /path/to/your/repo/src
```

**2. Check disk space**

Script will create ~70 KB in new files (plus documentation).

**3. Backup existing analyzers (optional)**

```bash
# Windows
xcopy C:\path\to\your\repo\src\cic\analyzers C:\backup\analyzers /E /Y

# Linux/macOS
cp -r /path/to/your/repo/src/cic/analyzers /backup/analyzers
```

### Phase 2: Dry-Run

**1. Preview deployment**

```bash
# Windows
deploy.bat "C:\path\to\your\repo" --dry-run

# Linux/macOS
./deploy.sh /path/to/your/repo --dry-run
```

Expected output:
```
[INFO] Source directory verified: ...
[INFO] Repository root verified: ...
[INFO] Creating target directories...
[INFO] Copying code files...
[INFO] Copying test files...
[INFO] Copying documentation files...
[WARN] DRY-RUN: Summary and patch files not generated
[WARN] DRY-RUN complete. No files were modified.
```

**2. Review output**

Ensure all files are listed. If any are missing, check the source directory.

### Phase 3: Execute Deployment

**1. Run deployment**

```bash
# Windows
deploy.bat "C:\path\to\your\repo"

# Linux/macOS
./deploy.sh /path/to/your/repo
```

Expected output:
```
[INFO] Source directory verified: ...
[INFO] Repository root verified: ...
[OK]   All files deployed successfully!
[OK]   Deployment complete!
```

**2. Verify files**

```bash
# Windows
dir /s C:\path\to\your\repo\src\cic\analyzers\image\v2

# Linux/macOS
find /path/to/your/repo/src/cic/analyzers/image/v2 -type f
```

---

## Post-Deployment Configuration

### Step 1: Fix Import Paths

The deployment script generates `IMPORT_PATHS.md` with guidance.

**1. Open generated guide**

```bash
# Windows
notepad C:\path\to\your\repo\src\cic\analyzers\image\v2\IMPORT_PATHS.md

# Linux/macOS
cat /path/to/your/repo/src/cic/analyzers/image/v2/IMPORT_PATHS.md
```

**2. Update imports in `imageAnalyzerV2Adapter.ts`**

Look for lines like:
```typescript
import type { WarmPoolManager } from '../../../runtime/warmPool/WarmPoolManager';
```

Change to match your actual folder structure (e.g., `../../../warmPool/WarmPoolManager` or wherever your WarmPoolManager lives).

**3. Similarly update `localImageExtractor.ts`**

### Step 2: Set Environment Variables

**1. Set Gemini API key**

```bash
# Windows (Command Prompt)
set GEMINI_API_KEY=your-key-here

# Windows (PowerShell)
$env:GEMINI_API_KEY = "your-key-here"

# Linux/macOS (Bash)
export GEMINI_API_KEY=your-key-here

# Linux/macOS (.bashrc or .zshrc, permanent)
echo 'export GEMINI_API_KEY=your-key-here' >> ~/.bashrc
source ~/.bashrc
```

**2. Verify API key is set**

```bash
# Windows
echo %GEMINI_API_KEY%

# Linux/macOS
echo $GEMINI_API_KEY
```

### Step 3: Run Tests

**1. Install test dependencies**

```bash
npm install --save-dev vitest
```

**2. Run Tier-1 tests**

```bash
npm test src/cic/analyzers/image/v2/__tests__/imageAnalyzerV2Adapter.test.ts
```

Expected: 22 tests ✓ PASS

**3. Run Tier-2 tests**

```bash
npm test src/cic/analyzers/image/v2/__tests__/imageAnalyzerV2-integration.test.ts
```

Expected: 30 tests ✓ PASS

### Step 4: Register in Pipeline

Follow the `INTEGRATION_PLAN.md` "Registry Patch" section:

**1. Import adapter**

```typescript
import { imageAnalyzerV2 } from './src/cic/analyzers/image/v2/imageAnalyzerV2Adapter';
```

**2. Register in your analyzer registry**

```typescript
registry.register(imageAnalyzerV2.id, imageAnalyzerV2);
```

**3. Initialize warm-pool**

Use `PHASE_28_WARMPOOL_TUNING.md` to configure:
- Model selection (LLaVA 1.5 INT8 recommended)
- GPU memory budget
- Concurrency settings
- OOM recovery

### Step 5: Deploy to Staging

**1. Commit changes**

```bash
git add src/cic/analyzers/image/v2/
git commit -m "feat: integrate imageAnalyzerV2 adapter (local + remote backends)"
```

**2. Run full test suite**

```bash
npm test
```

**3. Deploy to staging environment**

```bash
npm run deploy:staging
```

**4. Monitor for 24 hours**

Watch metrics:
- P99 latency (should be < 10 sec)
- GPU memory utilization
- API error rates
- Queue depth

### Step 6: Production Rollout

**1. Canary: 5% traffic**

Monitor for 24 hours.

**2. Ramp: 25% traffic**

Monitor for 24 hours.

**3. Full rollout: 100% traffic**

Monitor closely for first week.

---

## Troubleshooting

### Issue: Import Path Errors

**Error:** `Cannot find module '../../../runtime/warmPool/WarmPoolManager'`

**Solution:** Edit the import path in the adapter file to match your CIC structure. See `IMPORT_PATHS.md`.

### Issue: GEMINI_API_KEY Not Set

**Error:** `[RemoteImageExtractor] GEMINI_API_KEY not set`

**Solution:** Set the environment variable:
```bash
export GEMINI_API_KEY=your-key
```

### Issue: Test Failures

**Error:** Tests fail with "Mock not defined" or similar

**Solution:** Tests require vitest. Install it:
```bash
npm install --save-dev vitest
```

### Issue: File Not Found During Deployment

**Error:** `[WARN] File not found: imageAnalyzerV2Adapter.ts`

**Solution:** Ensure the source directory is correct:
```bash
# Windows
dir C:\Users\soren\AppData\Roaming\Claude\local-agent-mode-sessions\de3b53f4-cead-4497-ab62-b7aa13f73d25\cb5a7ad7-52ca-4f55-8bf5-016d22440e98\local_be4537f4-c0d2-49b8-9468-903932ce9663\outputs

# Linux/macOS
ls /mnt/outputs/ # (if mounted via WSL)
```

### Issue: Permission Denied

**Error:** `Permission denied: Cannot create directory`

**Solution:** Run with appropriate permissions:
```bash
# Windows: Run as Administrator
# Linux/macOS: Use sudo (if needed)
sudo ./deploy.sh /path/to/repo
```

---

## Rollback Procedure

If deployment fails, rollback is simple:

```bash
# Delete the new analyzer directory
rm -rf /path/to/repo/src/cic/analyzers/image/v2

# Restore from backup (if you made one)
cp -r /backup/analyzers/image /path/to/repo/src/cic/analyzers/

# Or revert git changes
git checkout src/cic/analyzers/
```

---

## Verification Checklist

After deployment, verify:

- [ ] All 5 code files in `src/cic/analyzers/image/v2/`
- [ ] Both test files in `src/cic/analyzers/image/v2/__tests__/`
- [ ] All 3 docs in `docs/analyzers/image/v2/`
- [ ] Import paths updated (check IMPORT_PATHS.md)
- [ ] GEMINI_API_KEY set in environment
- [ ] Tier-1 tests pass (22 tests)
- [ ] Tier-2 tests pass (30 tests)
- [ ] Adapter registered in pipeline
- [ ] Warm-pool initialized
- [ ] Prometheus metrics flowing (optional)

---

## Support

**Deployment Issues?**

1. Check DEPLOYMENT_SUMMARY.md (generated during deployment)
2. Review IMPORT_PATHS.md for path mapping
3. See Troubleshooting section above
4. Refer to INTEGRATION_PLAN.md for detailed steps

**Questions about architecture?**

See PHASE_28_WARMPOOL_TUNING.md for:
- Warm-pool tuning
- GPU memory budgeting
- OOM recovery
- Concurrency tuning
- Monitoring & alerting

---

**Deployment Status: ✓ READY**

All artifacts are in place. Run the deployment script to begin integration.

```bash
# Windows
deploy.bat "C:\path\to\repo"

# Linux/macOS
./deploy.sh /path/to/repo
```
