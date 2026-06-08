# Rewrite Labs Harvester ← Repomix Integration Plan

**Phase:** 4.4.2  
**Execution:** 2026-06-08 through 2026-06-13  
**Owner:** Harvester team (Chris, Balraj)

---

## Executive Summary

The **Rewrite Labs Harvester** needs to ingest customer repositories deterministically, extract structure and complexity metrics, and feed them into the Redesign phase. **Repomix** solves this by providing:

- JSON-formatted repository structure with metadata
- Compressed structural extraction (functions, classes, interfaces)
- Per-file token accounting for cost prediction
- Deterministic ordering for reproducible redesign logic
- Built-in secret detection for compliance

This plan details the **RepositoryIngestion** module that bridges Repomix output → Harvester Discovery.

---

## Architecture: Discovery Phase Enhancement

### Current Discovery Phase
```
Customer Request
  ↓
Crawl website (HTML/CSS/JS)
  ↓
Extract framework, dependencies, templates
  ↓
Build inventory (pages, assets, scripts)
  ↓
Redesign Phase
```

### Enhanced Discovery Phase (with Repomix)
```
Customer Request (repo URL or archive)
  ↓
Repomix Ingestion
  - Accept GitHub URL, GitLab, or local .tar.gz
  - Run Repomix: --json --compress --token-count --secretlint
  - Parse JSON output
  ↓
Repository Structure Analysis
  - Extract framework, language, architecture
  - Map file dependencies and complexity
  - Calculate token cost for redesign modeling
  - Flag secrets/credentials (abort if >0 found)
  ↓
Website Crawl + Repo Merge
  - Combine HTML/CSS structure with codebase patterns
  - Identify build pipeline, deployment infrastructure
  ↓
Enriched Inventory
  - Pages, assets, scripts, components, services
  - Code patterns, framework version, dependencies
  - Token budget for redesign proposals
  ↓
Redesign Phase
```

---

## Module: RepositoryIngestion

### 1. Interface Definition

```typescript
interface RepositorySource {
  type: 'github' | 'gitlab' | 'local' | 'archive';
  path: string; // user/repo, gitlab URL, ./repo-path, or /tmp/repo.tar.gz
  branch?: string; // default: 'main'
  depth?: number; // clone depth for performance
}

interface RepositoryStructure {
  repoId: string; // stable identifier
  framework: string; // 'react', 'vue', 'django', 'rails', etc.
  language: string; // 'typescript', 'python', 'go', etc.
  buildSystem: string; // 'webpack', 'vite', 'make', 'gradle', etc.
  rootDependencies: {
    count: number;
    topDeps: string[]; // top 5 by usage
    mainFramework?: string;
  };
  fileStructure: {
    totalFiles: number;
    byType: Record<string, number>; // .ts: 142, .js: 89, etc.
    complexity: 'simple' | 'moderate' | 'complex';
  };
  tokenMetrics: {
    totalTokens: number;
    compressedTokens: number; // after Tree-sitter extraction
    reductionPercent: number;
    perFile: Record<string, number>; // src/index.ts: 450
  };
  secretsDetected: string[]; // file paths with potential secrets
  repomixOutput: RepomixJSON; // raw Repomix output
}

interface RepomixJSON {
  summary: {
    totalFiles: number;
    totalSize: number; // bytes
    totalTokens: number;
  };
  files: {
    path: string;
    type: 'file' | 'directory';
    size: number;
    tokens: number;
    language?: string;
    content?: string; // for source files, after compression
  }[];
  structure: {
    // Tree-sitter extraction
    functions: Array<{ name: string; line: number; tokens: number }>;
    classes: Array<{ name: string; line: number; methods: number }>;
    imports: Array<{ from: string; items: string[] }>;
  };
  metadata: {
    timestamp: number;
    repomixVersion: string;
    commandLine: string;
  };
}
```

### 2. Core Methods

#### 2.1 `async ingestRepository(source: RepositorySource): Promise<RepositoryStructure>`

**Steps:**
1. **Resolve source:**
   - GitHub: use Repomix `--remote user/repo` flag
   - Local: validate path exists, use Repomix `--local ./path`
   - Archive: extract to temp directory, run Repomix on extracted path
   - GitLab: convert to HTTPS URL, use `--remote`

2. **Execute Repomix:**
   ```bash
   repomix \
     --remote [user/repo] | --local [./path] \
     --json \
     --compress \
     --token-count \
     --secretlint \
     --ignore .repomixignore \
     --output /tmp/repomix-${timestamp}.json \
     --verbose
   ```

3. **Parse JSON output:**
   ```javascript
   const repomixData = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
   ```

4. **Validate schema:**
   - Confirm required fields: `summary`, `files`, `metadata`
   - Check token counts > 0
   - Validate all file paths are strings

5. **Detect secrets:**
   - Check Secretlint report in Repomix output
   - If secrets found:
     - Log with operator visibility
     - Throw `SecretDetectedError` (abort ingestion)
     - Return failure to Harvester with reason

6. **Extract framework & language:**
   ```javascript
   const packageJson = repomixData.files.find(f => f.path === 'package.json');
   const pyproject = repomixData.files.find(f => f.path === 'pyproject.toml');
   
   const framework = detectFramework(packageJson, repomixData.files);
   const language = inferLanguage(repomixData.files);
   const buildSystem = inferBuildSystem(repomixData.files);
   ```

7. **Calculate token metrics:**
   ```javascript
   const totalTokens = repomixData.summary.totalTokens;
   const compressedTokens = repomixData.files.reduce((sum, f) => sum + f.tokens, 0);
   const reductionPercent = ((totalTokens - compressedTokens) / totalTokens * 100).toFixed(1);
   ```

8. **Aggregate file complexity:**
   ```javascript
   const fileCount = repomixData.files.filter(f => f.type === 'file').length;
   const avgFileSize = totalTokens / fileCount;
   const complexity = avgFileSize > 1000 ? 'complex' : avgFileSize > 300 ? 'moderate' : 'simple';
   ```

9. **Return structured output:**
   ```javascript
   return {
     repoId: generateStableId(source),
     framework,
     language,
     buildSystem,
     rootDependencies: parseRootDeps(packageJson),
     fileStructure: { totalFiles: fileCount, byType: aggregateByType(files), complexity },
     tokenMetrics: { totalTokens, compressedTokens, reductionPercent, perFile: {} },
     secretsDetected: [],
     repomixOutput: repomixData,
   };
   ```

#### 2.2 `async validateSecrets(repomixOutput: RepomixJSON): Promise<SecretReport>`

**Steps:**
1. Check if Repomix Secretlint integration found any credentials:
   ```javascript
   const secrets = repomixOutput.metadata.secretlintReport || [];
   ```

2. If secrets found:
   ```javascript
   return {
     hasSecrets: true,
     count: secrets.length,
     files: secrets.map(s => s.filePath),
     types: secrets.map(s => s.secretType), // 'aws_key', 'github_token', etc.
   };
   ```

3. Log and alert operator:
   ```javascript
   logger.warn('SECRETS_DETECTED', {
     repoId: source.path,
     secretCount: secrets.length,
     affectedFiles: secrets.map(s => s.filePath),
   });
   metrics.increment('harvester.secrets_detected');
   ```

#### 2.3 `extractDependencyTree(packageJson: object, languagePackageFiles: File[]): DependencyTree`

**Steps:**
1. Parse `package.json` (Node.js):
   ```javascript
   const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
   ```

2. Extract top N dependencies by frequency/usage:
   ```javascript
   const topDeps = Object.keys(deps)
     .sort((a, b) => countUsageInFiles(repomixData.files, a) - countUsageInFiles(repomixData.files, b))
     .slice(0, 5);
   ```

3. Detect framework:
   ```javascript
   if (deps['react']) return 'react';
   if (deps['vue']) return 'vue';
   if (deps['@angular/core']) return 'angular';
   if (deps['django']) return 'django';
   if (deps['rails']) return 'rails';
   // ... etc
   ```

4. Return dependency tree with counts.

#### 2.4 `calculateTokenBudget(tokenMetrics: TokenMetrics): TokenBudget`

**Purpose:** Help Redesign phase estimate cost for LLM calls.

**Steps:**
1. Establish baseline:
   ```javascript
   const compressedTokens = tokenMetrics.compressedTokens;
   const avgComponentTokens = compressedTokens / estimatedComponentCount;
   ```

2. Budget allocation:
   ```javascript
   const budget = {
     repositoryAnalysis: compressedTokens * 0.5,    // Full codebase context
     designGeneration: compressedTokens * 1.5,      // Larger model call
     codeGeneration: compressedTokens * 2.0,        // Full diff generation
     testGeneration: compressedTokens * 1.0,        // Test writing
     total: compressedTokens * 5.0,
   };
   ```

3. Feed to TokenEconomyAgent for routing decisions:
   ```javascript
   await codeburnTelemetry.emit({
     event: 'HARVESTER_TOKEN_BUDGET',
     repoId,
     tokenBudget: budget,
     framework,
     language,
   });
   ```

---

## Integration Points

### A. Harvester Discovery Phase (main)

```javascript
// In Harvester/Discovery.ts
import { RepositoryIngestion } from './modules/RepositoryIngestion';

async function discoverRepository(customerRequest: CustomerRequest) {
  const ingestion = new RepositoryIngestion();
  
  // Ingest repo structure
  const repoStructure = await ingestion.ingestRepository({
    type: 'github',
    path: customerRequest.repositoryUrl,
  });
  
  // Abort if secrets found
  if (repoStructure.secretsDetected.length > 0) {
    throw new SecretDetectedError(
      `Found ${repoStructure.secretsDetected.length} secrets; aborting ingestion.`
    );
  }
  
  // Merge with website crawl results
  const discovery = {
    website: await crawlWebsite(customerRequest.websiteUrl),
    repository: repoStructure,
    tokenBudget: ingestion.calculateTokenBudget(repoStructure.tokenMetrics),
  };
  
  return discovery;
}
```

### B. CodeBurn Telemetry

```javascript
// Emit token metrics to CodeBurn
await codeburnProvider.emit({
  event: 'HARVESTER_INGESTION',
  tenantId: customerRequest.tenantId,
  repoId: repoStructure.repoId,
  framework: repoStructure.framework,
  totalTokens: repoStructure.tokenMetrics.totalTokens,
  compressedTokens: repoStructure.tokenMetrics.compressedTokens,
  reductionPercent: repoStructure.tokenMetrics.reductionPercent,
  timestamp: Date.now(),
});
```

### C. Redesign Phase Routing

```javascript
// In Redesign phase, use token metrics to select model
const modelForRedesign = tokenEconomyAgent.selectModel({
  estimatedTokens: discovery.tokenBudget.designGeneration,
  framework: discovery.repository.framework,
  historicalCost: codeburnDashboard.getAverageCost('redesign', discovery.repository.framework),
});
```

---

## Testing Strategy

### Unit Tests

1. **Repository ingestion parsing:**
   - Valid Repomix JSON → correct RepositoryStructure
   - Invalid JSON → throws ParseError
   - Missing required fields → throws SchemaError

2. **Secret detection:**
   - Secretlint reports present → returns SecretReport
   - Zero secrets → returns empty array
   - Malformed Secretlint data → logs warning, continues

3. **Framework detection:**
   - React, Vue, Angular projects → correctly identified
   - Django, Rails projects → correctly identified
   - Multi-framework projects → priority ordering
   - Unknown frameworks → fallback to 'generic'

4. **Token calculation:**
   - Compression savings > 30% for typical repo → assertion
   - Per-file tokens match summary → validation
   - Token budget allocation sums correctly → check

### E2E Tests

```javascript
// test/integration/harvester-repomix.test.ts

describe('Harvester ← Repomix Integration', () => {
  const testRepos = [
    { name: 'react-simple', size: 'small', tokens: 12000 },
    { name: 'rails-moderate', size: 'medium', tokens: 85000 },
    { name: 'angular-complex', size: 'large', tokens: 240000 },
  ];
  
  testRepos.forEach(repo => {
    it(`should ingest ${repo.name} deterministically`, async () => {
      const ingestion = new RepositoryIngestion();
      
      // Run 3 times, expect identical output
      const results = await Promise.all([
        ingestion.ingestRepository({ type: 'github', path: repo.path }),
        ingestion.ingestRepository({ type: 'github', path: repo.path }),
        ingestion.ingestRepository({ type: 'github', path: repo.path }),
      ]);
      
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
    });
    
    it(`should achieve 30%+ compression on ${repo.name}`, async () => {
      const result = await ingestion.ingestRepository({ type: 'github', path: repo.path });
      expect(result.tokenMetrics.reductionPercent).toBeGreaterThan(30);
    });
  });
  
  it('should abort on secret detection', async () => {
    const ingestion = new RepositoryIngestion();
    // Repo with intentionally leaked secret
    await expect(
      ingestion.ingestRepository({ type: 'github', path: 'test/repo-with-secret' })
    ).rejects.toThrow(SecretDetectedError);
  });
});
```

---

## Deployment & Handoff

### Pre-Deployment Checklist

- [ ] RepositoryIngestion module fully tested (unit + E2E)
- [ ] Secret detection validation on real repos (no false negatives)
- [ ] Token metrics benchmarked against actual Redesign costs
- [ ] CodeBurn telemetry wired and validated in staging
- [ ] Operator docs: how to handle secret detection errors
- [ ] Rollback plan: if Repomix introduces failures, disable and fallback to raw crawl

### Operator Handoff (2026-06-14)

**SOP: Repository Ingestion Workflow**

1. **Customer submits repo:**
   ```
   POST /harvester/discovery
   {
     "tenantId": "acme-corp",
     "websiteUrl": "https://acme-corp.example.com",
     "repositoryUrl": "https://github.com/acme-corp/website"
   }
   ```

2. **Harvester runs Repomix:**
   - Ingests repo structure
   - Validates no secrets
   - Extracts framework, dependencies, token budget

3. **On secret detection:**
   ```
   Response: 409 Conflict
   {
     "error": "SECRET_DETECTED",
     "message": "Found 2 potential secrets in 1 file",
     "affectedFiles": ["src/.env.local"],
     "action": "Operator must review and remove secrets, then retry"
   }
   ```

4. **Success response:**
   ```json
   {
     "discoveryId": "disc_abc123",
     "repository": {
       "framework": "react",
       "language": "typescript",
       "fileCount": 142,
       "tokenMetrics": {
         "compressedTokens": 45000,
         "reductionPercent": 38
       }
     },
     "tokenBudget": {
       "designGeneration": 67500,
       "total": 225000
     }
   }
   ```

5. **Proceed to Redesign phase** with token-aware routing.

---

## Success Criteria

- ✅ Ingest 18/20 SMB benchmark repos without error
- ✅ Secrets detected on 100% of test corpus (zero false negatives)
- ✅ Token savings: 30–50% vs. raw file concatenation
- ✅ Deterministic output: CRC32 hash of JSON matches across 10 runs
- ✅ CodeBurn telemetry: all ingestions logged with framework, language, tokens
- ✅ Redesign phase: uses token budget for model selection (validated in staging)

