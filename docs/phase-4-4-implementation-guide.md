# Phase 4.4 Implementation Guide — Repomix Integration

**Status:** READY FOR EXECUTION  
**Start Date:** 2026-06-07  
**End Date:** 2026-06-14  
**Owner:** Rewrite Labs + CIC Infrastructure teams

---

## Quick Start

### Prerequisites
```bash
npm install repomix crc-32 uuid
npm install --save-dev jest @types/jest ts-jest
```

### File Inventory

All implementation files are now in the repo:

| File | Path | Status |
|------|------|--------|
| **RepositoryIngestion.ts** | `rewrite-labs/harvester/repository/RepositoryIngestion.ts` | ✅ Created |
| **RepositoryIngestion.test.ts** | `rewrite-labs/harvester/repository/RepositoryIngestion.test.ts` | ✅ Created |
| **HarvesterPipeline.ts** | `rewrite-labs/harvester/HarvesterPipeline.ts` | ✅ Created |
| **repomix-presets.json** | `tools/repomix/repomix-presets.json` | ✅ Created |
| **loadPreset.ts** | `tools/repomix/loadPreset.ts` | ✅ Created |
| **RepoAnalysisBridge.ts** | `cic/bridge/RepoAnalysisBridge.ts` | ✅ Created |
| **crc32-determinism.test.ts** | `tools/repomix/tests/crc32-determinism.test.ts` | ⏳ Next |

---

## Phase Breakdown

### 4.4.1: Repomix Installation & CLI Presets ✅ COMPLETE

**Deliverables:**
- ✅ Repomix installed as NPM dependency
- ✅ CLI presets defined in `repomix-presets.json`
- ✅ Preset loader utility: `loadPreset.ts`

**Usage:**
```typescript
import { getPreset, getPresetArgs } from './tools/repomix/loadPreset';

const preset = getPreset('json-default');
console.log(preset.args); // ["--style", "json", "--token-count-tree"]

const args = getPresetArgs('remote-json');
// Pass to Repomix CLI
```

**Operators can list presets:**
```typescript
import { listPresets } from './tools/repomix/loadPreset';

listPresets().forEach(p => {
  console.log(`${p.name}: ${p.useCase}`);
});
```

---

### 4.4.2: Rewrite Labs Harvester Integration ✅ COMPLETE

**Core module:** `RepositoryIngestion.ts`

**Entry point:**
```typescript
const ingestion = new RepositoryIngestion("repomix");
const result = await ingestion.ingestRepository("https://github.com/user/repo");

// Returns:
// {
//   repomix: { files, totalTokens },
//   dependencies: { framework, topDependencies, buildSystem },
//   tokenBudget: { analysis, redesign, validation, totalTokens }
// }
```

**Integration with HarvesterPipeline:**
```typescript
const pipeline = new HarvesterPipeline();
const result = await pipeline.run("https://github.com/user/repo");

// Detects repo automatically, returns:
// { type: "repository", data: { repomix, dependencies, tokenBudget } }
```

**Test coverage:** `RepositoryIngestion.test.ts`
- ✅ Small, medium, large repo ingestion
- ✅ Framework detection (React, Vue, Django, Rails, etc.)
- ✅ Deterministic token budgeting (same output on repeated runs)
- ✅ Secret detection (fail-fast on credentials)

**Execute tests:**
```bash
npm test -- rewrite-labs/harvester/repository/RepositoryIngestion.test.ts
```

---

### 4.4.3: CIC Repomix Bridge ✅ COMPLETE

**Core module:** `RepoAnalysisBridge.ts`

**Entry point:**
```typescript
const bridge = new RepoAnalysisBridge();
const externalRepo = await bridge.analyze(repomixJSON, "github-acme-corp");

// Returns ExternalRepositoryNode:
// {
//   id: "uuid",
//   repoId: "github-acme-corp",
//   architecture: "modular",
//   dependencies: ["react", "axios", ...],
//   patterns: { naming: [...], async: [...], testing: [...], ... },
//   embeddingId: "uuid",
//   createdAt: "2026-06-07T..."
// }
```

**What the bridge does:**
1. **Detects architecture pattern:** monolith vs modular vs microservices
2. **Extracts dependencies:** top N deps from package.json, requirements.txt, etc.
3. **Extracts code patterns:** naming conventions, async style, testing frameworks, error handling, docs
4. **Creates embeddings:** converts repo structure to vector for similarity matching
5. **Persists to KG:** writes ExternalRepositoryNode to CIC Knowledge Graph
6. **Links similar repos:** finds existing repos with >0.7 cosine similarity and creates edges

---

### 4.4.4: Token & Cost Telemetry ⏳ READY TO WIRE

**Integration point:** Hook into CodeBurn telemetry bus after `ingestRepository()` succeeds:

```typescript
// In HarvesterPipeline or calling code:
const repoResult = await this.repositoryIngestion.ingestRepository(target);

// Emit to CodeBurn
await codeburnProvider.emit({
  event: 'HARVESTER_INGESTION',
  tenantId: customerRequest.tenantId,
  repoId: repoResult.repomix.repoId,
  framework: repoResult.dependencies.framework,
  totalTokens: repoResult.repomix.totalTokens,
  compressedTokens: repoResult.repomix.totalTokens, // refine with actual compression
  timestamp: Date.now(),
});
```

**Dashboard visibility:**
- Per-tenant ingestion costs
- Per-framework costs (React vs Django vs Rails)
- Token reduction %; benchmark against raw concatenation

---

### 4.4.5: Security & Compliance ⏳ READY TO INTEGRATE

**Current implementation:**
- `validateSecrets()` in RepositoryIngestion checks for API_KEY, SECRET, TOKEN patterns
- Throws `SecretDetectedError` on any match (fail-fast)

**Next steps:**
1. **Integrate Secretlint:** wire Repomix `--secretlint` flag output
2. **Audit trails:** log all remote repo accesses with operator ID, timestamp, outcome
3. **Sandbox:** run Repomix in isolated container (Docker) to prevent escape

**Stub for audit logging:**
```typescript
// In RepositoryIngestion.ingestRepository():
await auditLog({
  event: 'REPO_INGESTION',
  repoUrl: repoPathOrRemote,
  operator: process.env.OPERATOR_ID || 'unknown',
  status: 'success' | 'failed',
  secretsDetected: secretReport.count,
  timestamp: Date.now(),
});
```

---

### 4.4.6: Testing & Validation ⏳ READY TO EXECUTE

#### Unit Tests (Complete)
```bash
npm test -- RepositoryIngestion.test.ts
```

Validates:
- ✅ Framework detection (React, Vue, Django, Rails)
- ✅ Token budget allocation (30% analysis, 50% redesign, 20% validation)
- ✅ Deterministic output (same input → same output)
- ✅ Secret detection (fails on credentials)

#### E2E Tests (Next)

**Create test fixtures:**
```bash
mkdir -p rewrite-labs/harvester/fixtures/{repo-small,repo-medium,repo-large,repo-with-secrets}

# repo-small: simple React app
# repo-medium: full Node.js backend + React frontend
# repo-large: monorepo with 20+ packages
# repo-with-secrets: intentional API keys for testing
```

**Run E2E suite:**
```bash
npm test -- --testPathPattern="e2e" rewrite-labs/harvester/
```

#### Determinism Validation

**Create fixture in:** `tools/repomix/tests/`

**Run determinism harness (10 iterations):**
```bash
npm run test:repomix:determinism
```

Expected output:
```
Run 1: CRC32=a1b2c3d4
Run 2: CRC32=a1b2c3d4
...
Run 10: CRC32=a1b2c3d4
✅ CRC32 determinism PASSED
```

#### Token Compression Benchmark

```bash
# Measure raw concatenation vs Repomix JSON compression
npm run bench:repomix:compression

# Expected: 30-50% savings
# Raw: 240KB → Compressed: 140KB (42% reduction)
```

---

## Execution Timeline

### Day 1 (2026-06-07): Prep & Validation

```bash
# Install dependencies
npm install repomix crc-32 uuid

# Verify all files created
ls -la rewrite-labs/harvester/repository/
ls -la tools/repomix/
ls -la cic/bridge/

# Run unit tests
npm test -- RepositoryIngestion.test.ts
```

**Checklist:**
- [ ] Repomix binary available in PATH
- [ ] NPM dependencies installed
- [ ] All 6 source files created and linted
- [ ] Unit tests passing (4/4)

### Day 2 (2026-06-08): Harvester Integration

```bash
# Integrate RepositoryIngestion into HarvesterPipeline
# Verify website + repo detection logic

npm test -- HarvesterPipeline.test.ts

# Manual test:
node -e "
const { HarvesterPipeline } = require('./rewrite-labs/harvester/HarvesterPipeline');
const p = new HarvesterPipeline();
p.run('./local-repo-path').then(r => console.log(JSON.stringify(r, null, 2)));
"
```

**Checklist:**
- [ ] HarvesterPipeline.ts compiles
- [ ] repo vs website detection works
- [ ] RepositoryIngestion module integrated
- [ ] Token budget calculations verified

### Day 3 (2026-06-09): CIC Bridge

```bash
# Verify RepoAnalysisBridge standalone
# Create test Repomix output

node -e "
const { RepoAnalysisBridge } = require('./cic/bridge/RepoAnalysisBridge');
const bridge = new RepoAnalysisBridge();
const rep = require('./sample-repomix-output.json');
bridge.analyze(rep, 'test-repo').then(r => console.log(JSON.stringify(r, null, 2)));
"
```

**Checklist:**
- [ ] RepoAnalysisBridge.ts compiles
- [ ] Architecture detection accurate (monolith/modular/microservices)
- [ ] Dependency extraction works
- [ ] Pattern detection picks up async/await, testing frameworks, etc.
- [ ] KG node creation stubbed (ready for real KG integration)

### Day 4 (2026-06-10): Token Telemetry

```bash
# Wire RepositoryIngestion → CodeBurn

# Verify telemetry event structure
npm test -- CodeBurnTelemetry.test.ts
```

**Checklist:**
- [ ] CodeBurn telemetry event emitted on successful ingestion
- [ ] Per-tenant, per-repo cost tracking in dashboards
- [ ] Token reduction % visible in metrics

### Days 5–6 (2026-06-11–12): Security & Testing

```bash
# Run full test suite
npm test -- --testPathPattern="repomix|harvester|cic/bridge"

# Determinism validation (10 runs)
npm run test:repomix:determinism

# Compression benchmark
npm run bench:repomix:compression

# Secret detection on test corpus
npm test -- secret-detection.test.ts
```

**Checklist:**
- [ ] All tests passing (unit + E2E)
- [ ] Determinism validated (CRC32 stable)
- [ ] Token compression: 30–50% achieved
- [ ] Secret detection: 100% on test corpus
- [ ] Audit trails logged for all repo accesses

### Day 7 (2026-06-13): Staging Validation

```bash
# Deploy to staging
npm run build
npm run deploy:staging

# Integration test: real customer repo
curl -X POST http://staging.example.com/harvester/discover \
  -d '{"repositoryUrl":"https://github.com/test/repo"}'

# Verify results in staging dashboards
# - Harvester Discovery phase complete
# - CodeBurn telemetry populated
# - CIC KG nodes created (if bridge integrated)
```

**Checklist:**
- [ ] Staging deployment successful
- [ ] Real repo ingestion working end-to-end
- [ ] Token metrics visible in CodeBurn
- [ ] No secrets leaked in logs

### Day 8 (2026-06-14): Production Rollout

```bash
# Final validation
npm run test:repomix:determinism
npm test -- --coverage

# Production deployment
npm run deploy:production

# Monitor
curl http://prod.example.com/health
# Watch logs for HARVESTER_INGESTION telemetry events
```

**Checklist:**
- [ ] Production deployment complete
- [ ] Metrics flowing to CodeBurn
- [ ] Operator SOP documented and trained
- [ ] Rollback plan tested
- [ ] 24/7 monitoring in place

---

## Success Criteria Validation

### ✅ Repomix JSON ingestion works for 18/20 SMB repos

**Test:**
```bash
npm run test:ingest-benchmark-repos
# Should show 18/20 successful ingestions
```

### ✅ Token savings: 30–50% reduction

**Test:**
```bash
npm run bench:repomix:compression
# Compare raw file concat vs Repomix JSON output
```

### ✅ Deterministic output: identical across 10 runs

**Test:**
```bash
npm run test:repomix:determinism
# All 10 CRC32 hashes must match
```

### ✅ Secret detection: 100% on test corpus

**Test:**
```bash
npm test -- secret-detection.test.ts
# All repos with secrets must be rejected
```

### ✅ CIC bridge: analyze external repos

**Test:**
```bash
node -e "
const bridge = new RepoAnalysisBridge();
const node = await bridge.analyze(repomixOutput, 'test-repo');
console.log(node.architecture); // monolith|modular|microservices
console.log(node.dependencies); // [...]
console.log(node.patterns); // { naming, async, testing, ... }
"
```

### ✅ Cost telemetry: per-repo, per-tenant visible

**Test:**
```bash
# Check CodeBurn dashboard
curl http://codeburn.example.com/api/metrics/harvester
# Should show: { tenantId, repoId, framework, tokens, timestamp }
```

---

## Operator SOP (Standard Operating Procedure)

### Discovering a Repository

**Customer provides:** GitHub URL or `.tar.gz` archive

**Operator action:**
```bash
POST /harvester/discover
{
  "tenantId": "acme-corp",
  "repositoryUrl": "https://github.com/acme-corp/website"
}
```

**Expected response (success):**
```json
{
  "discoveryId": "disc_abc123",
  "repository": {
    "framework": "react",
    "language": "typescript",
    "fileCount": 142,
    "tokenMetrics": { "compressedTokens": 45000 }
  },
  "tokenBudget": { "total": 225000 },
  "status": "success"
}
```

**Expected response (secrets detected):**
```json
{
  "status": "error",
  "code": "SECRET_DETECTED",
  "affectedFiles": ["src/.env.local"],
  "action": "Remove secrets and retry"
}
```

### Handling Failures

| Error | Action |
|-------|--------|
| **Secret detected** | Operator contacts customer, removes secrets, retries |
| **Repomix timeout** | Operator checks repo size; may need remote ingestion vs clone |
| **Unsupported language** | Log in metadata; continue with best-effort detection |
| **Token overflow** | Operator may request compression preset or split repo |

### Rollback Plan

If Phase 4.4 introduces failures:

```bash
# Disable Repomix integration
git checkout HEAD~1 -- rewrite-labs/harvester/RepositoryIngestion.ts
npm run deploy:production

# Fallback: raw HTML crawl only (existing behavior)
```

---

## What's Next (After Phase 4.4)

1. **Phase 4.5:** TokenEconomyAgent integration (use token budget for model routing)
2. **Phase 29:** Rewrite Labs ↔ CIC Fusion (feed repo patterns back to CIC optimization)
3. **Phase 24:** Skill Graph (index extracted code patterns, update capability model)

---

## References

- [Phase 4.4 Master Roadmap Entry](CIC_MASTER_ROADMAP.md#phase-44)
- [Rewrite Labs Harvester Integration Plan](rewrite-labs-repomix-harvester-integration.md)
- [CIC Repomix Bridge Design](phase-4-4-repomix-cic-bridge-design.md)
- [Repomix Official Docs](https://github.com/yamadashy/repomix)
- [Token Accounting Best Practices](docs/token-accounting.md)

