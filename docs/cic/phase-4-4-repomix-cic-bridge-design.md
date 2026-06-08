# CIC Repomix Bridge Design (Phase 4.4.3)

**Phase:** 4.4.3  
**Execution:** 2026-06-09 through 2026-06-11  
**Owner:** CIC Infrastructure (ARPS, Knowledge Graph teams)

---

## Executive Summary

The **CIC Repomix Bridge** converts Repomix JSON output into CIC-native data structures, enabling:

1. **External Repository Analysis:** Ingest third-party repos (competitors, similar projects) for pattern analysis
2. **Knowledge Graph Enrichment:** Feed repository patterns (architecture, dependencies, frameworks) into CKG
3. **Reasoning Signal Augmentation:** Enhance ARL's semantic and narrative signals with external code patterns
4. **Autonomous Expansion Validation:** Use external patterns to validate CIC's own expansion proposals

This bridge is invoked via:
- REST endpoint: `POST /cic/repos/analyze`
- CIC Harvester agent: `AnalyzeRepositoryIntent`
- Manual operator: CLI tool `cic repo:analyze`

---

## Architecture: Bridge Components

### 1. Input Layer: Repomix JSON → Normalized Repository Model

```typescript
interface RepomixInput {
  repoId: string;
  repomixJSON: {
    summary: { totalFiles: number; totalTokens: number };
    files: Array<{
      path: string;
      type: 'file' | 'directory';
      tokens: number;
      language?: string;
      content?: string;
    }>;
    structure: {
      functions: Array<{ name: string; line: number }>;
      classes: Array<{ name: string; methods: number }>;
      imports: Array<{ from: string; items: string[] }>;
    };
    metadata: { timestamp: number; repomixVersion: string };
  };
}

// Normalized internal model
interface NormalizedRepository {
  externalId: string; // globally unique identifier
  sourceType: 'github' | 'gitlab' | 'local';
  sourceUrl: string;
  ingestedAt: number;
  structure: {
    framework: string;
    language: string;
    buildSystem: string;
    architecture: ArchitecturePattern;
    componentCount: number;
  };
  codePatterns: CodePatternSignal[];
  dependencyGraph: DependencyGraphSignal;
}

interface ArchitecturePattern {
  pattern: 'monolith' | 'modular' | 'microservices' | 'unknown';
  confidence: number; // 0-1
  reasoning: string; // why CIC inferred this pattern
}

interface CodePatternSignal {
  category: 'naming' | 'structure' | 'async' | 'error_handling' | 'testing' | 'documentation';
  pattern: string; // e.g., "camelCase", "async/await", "try-catch", "Jest tests"
  prevalence: number; // 0-1, % of relevant files using this pattern
  examples: string[]; // file paths exemplifying this pattern
}

interface DependencyGraphSignal {
  directDependencies: Map<string, number>; // dep -> usage count
  topDependencies: string[]; // top 5 by prevalence
  devVsProduction: { dev: number; prod: number };
  licenseDistribution: Record<string, number>; // 'MIT': 23, 'Apache-2.0': 8
}
```

### 2. Processing Layer: Pattern Extraction

#### 2.1 `extractArchitecturePattern(repomixJSON): ArchitecturePattern`

**Heuristics:**

```typescript
const patterns = {
  monolith: {
    indicators: [
      'single src/ or lib/ directory',
      'all code in one framework',
      'single package.json or requirements.txt',
    ],
    score: (fileStructure) => {
      const topDirCount = countTopLevelDirs(fileStructure);
      if (topDirCount <= 2) return 0.8; // strong monolith signal
      return 0.3;
    },
  },
  modular: {
    indicators: [
      'src/modules/, src/packages/, or src/features/',
      'separate package.json per module',
      'clear import boundaries',
    ],
    score: (fileStructure) => {
      if (fileStructure.includes('src/modules/') || fileStructure.includes('src/packages/')) {
        return 0.9;
      }
      return 0.2;
    },
  },
  microservices: {
    indicators: [
      'services/, backend/, api/, gateway/ directories',
      'docker-compose.yml or Kubernetes manifests',
      'separate repos per service (detected via imports)',
    ],
    score: (fileStructure) => {
      if (fileStructure.includes('services/') && fileStructure.includes('docker-compose')) {
        return 0.85;
      }
      return 0.1;
    },
  },
};

// Scoring algorithm
function detectArchitecture(repomixJSON) {
  const fileStructure = repomixJSON.files.map(f => f.path).join('\n');
  const scores = Object.entries(patterns).map(([pattern, { score }]) => ({
    pattern,
    confidence: score(fileStructure),
  }));
  
  const best = scores.sort((a, b) => b.confidence - a.confidence)[0];
  return {
    pattern: best.pattern,
    confidence: best.confidence,
    reasoning: `Detected via: ${patterns[best.pattern].indicators.join('; ')}`,
  };
}
```

#### 2.2 `extractCodePatterns(repomixJSON): CodePatternSignal[]`

**Pattern categories:**

```typescript
const patterns = {
  naming: {
    detect: (imports, files) => {
      const camelCase = files.filter(f => /\b[a-z]+[A-Z][a-z]+/g.test(f.path)).length;
      const snake_case = files.filter(f => /_[a-z]+_/g.test(f.path)).length;
      return [
        {
          pattern: 'camelCase',
          prevalence: camelCase / files.length,
        },
        {
          pattern: 'snake_case',
          prevalence: snake_case / files.length,
        },
      ];
    },
  },
  async: {
    detect: (files, content) => {
      const asyncAwait = content.split('async').length - 1;
      const callbacks = content.split('function(err').length - 1;
      const promises = content.split('.then(').length - 1;
      return [
        {
          pattern: 'async/await',
          prevalence: asyncAwait / (asyncAwait + callbacks + promises),
        },
        {
          pattern: 'Promises',
          prevalence: promises / (asyncAwait + callbacks + promises),
        },
      ];
    },
  },
  testing: {
    detect: (files) => {
      const testFrameworks = new Map();
      if (files.some(f => f.includes('jest'))) testFrameworks.set('Jest', 1);
      if (files.some(f => f.includes('mocha'))) testFrameworks.set('Mocha', 1);
      if (files.some(f => f.includes('pytest'))) testFrameworks.set('pytest', 1);
      if (files.some(f => f.includes('rspec'))) testFrameworks.set('RSpec', 1);
      
      const testFileCount = files.filter(f => f.includes('.test.') || f.includes('.spec.')).length;
      return Array.from(testFrameworks.keys()).map(fw => ({
        pattern: fw,
        prevalence: testFileCount / files.length,
      }));
    },
  },
};
```

#### 2.3 `extractDependencyGraph(repomixJSON): DependencyGraphSignal`

```typescript
function extractDependencies(repomixJSON) {
  const importsMap = new Map<string, number>();
  
  // Count all imports
  repomixJSON.structure.imports.forEach(imp => {
    const from = imp.from.replace('@scope/', '').split('/')[0]; // normalize scoped packages
    importsMap.set(from, (importsMap.get(from) || 0) + imp.items.length);
  });
  
  // Categorize as dev vs production
  // (Heuristic: dev if imported only in test/spec files, build config, or tools)
  const devPatterns = ['.test.', '.spec.', 'webpack', 'rollup', 'babel', 'eslint'];
  const devDeps = new Set();
  const prodDeps = new Set();
  
  importsMap.forEach((count, dep) => {
    if (devPatterns.some(pat => files.filter(f => f.includes(pat) && f.includes(dep)).length > 0)) {
      devDeps.add(dep);
    } else {
      prodDeps.add(dep);
    }
  });
  
  return {
    directDependencies: importsMap,
    topDependencies: Array.from(importsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([dep, _]) => dep),
    devVsProduction: {
      dev: devDeps.size,
      prod: prodDeps.size,
    },
  };
}
```

### 3. CIC Integration Layer: Normalized Model → CIC Data Structures

#### 3.1 Convert to KG Node

```typescript
function toKnowledgeGraphNode(normalized: NormalizedRepository): KGNode {
  return {
    nodeId: generateKGNodeId('external_repo', normalized.externalId),
    nodeType: 'ExternalRepository',
    properties: {
      sourceUrl: normalized.sourceUrl,
      sourceType: normalized.sourceType,
      ingestedAt: normalized.ingestedAt,
      framework: normalized.structure.framework,
      language: normalized.structure.language,
      architecture: normalized.structure.architecture.pattern,
      architectureConfidence: normalized.structure.architecture.confidence,
      componentCount: normalized.structure.componentCount,
      topDependencies: normalized.dependencyGraph.topDependencies,
    },
    embeddings: {
      // Vectorize framework + language + architecture
      structureVector: encodeArchitecture(normalized.structure),
      // Vectorize code patterns
      codePatternVector: encodePatterns(normalized.codePatterns),
    },
    metadata: {
      sourcePhase: 'Phase 4.4.3 — Repomix Bridge',
      credibility: 0.85, // external repos are lower credibility than archival
      retentionDays: 90, // external repos archived after 90 days
    },
  };
}
```

#### 3.2 Connect to Existing Nodes via Semantic Similarity

```typescript
async function linkToExistingArchitectures(node: KGNode, ckgClient: CKGClient) {
  // Find existing architecture nodes in CKG
  const existingArchitectures = await ckgClient.query({
    nodeType: 'Architecture',
    properties: { pattern: node.properties.architecture },
  });
  
  // Create semantic similarity edges
  for (const existing of existingArchitectures) {
    const similarity = cosineSimilarity(
      node.embeddings.structureVector,
      existing.embeddings.structureVector
    );
    
    if (similarity > 0.7) { // strong similarity threshold
      await ckgClient.createEdge({
        from: node.nodeId,
        to: existing.nodeId,
        relationship: 'SIMILAR_TO',
        weight: similarity,
        metadata: {
          framework: node.properties.framework,
          language: node.properties.language,
        },
      });
    }
  }
}
```

#### 3.3 Augment ARL Reasoning Signals

```typescript
// In ARL's SemanticAlignment subsystem, when evaluating an expansion:
async function augmentWithExternalPatterns(
  expansion: Expansion,
  ckgClient: CKGClient,
  arls: SemanticAlignmentScorer
) {
  // Find similar external repositories
  const similarRepos = await ckgClient.query({
    nodeType: 'ExternalRepository',
    embeddings: expansion.semanticVector,
    limit: 5,
  });
  
  // Extract patterns from similar repos
  const externalPatterns = similarRepos.flatMap(repo => 
    repo.properties.codePatterns || []
  );
  
  // Use patterns to boost or penalize ARL signals
  let semanticBoost = 0;
  if (expansion.codeChanges.some(change => 
      externalPatterns.some(pat => pat.pattern.includes(change.pattern))
  )) {
    semanticBoost += 0.15; // boost: pattern seen in external code
  }
  
  return {
    ...expansion,
    arls: {
      ...expansion.arls,
      semanticAlignment: expansion.arls.semanticAlignment + semanticBoost,
      externalPatternConfidence: similarRepos.length > 0 ? 0.8 : 0.0,
    },
  };
}
```

---

## REST API Endpoint: `/cic/repos/analyze`

### Request

```http
POST /cic/repos/analyze
Content-Type: application/json

{
  "externalId": "github-acme-corp-website",
  "sourceType": "github",
  "sourceUrl": "https://github.com/acme-corp/website",
  "repomixJSON": { /* full Repomix JSON output */ }
}
```

### Response (Success)

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "success",
  "kgNodeId": "kg_external_repo_abc123",
  "analysis": {
    "framework": "react",
    "language": "typescript",
    "architecture": "modular",
    "architectureConfidence": 0.92,
    "codePatterns": [
      {
        "category": "async",
        "pattern": "async/await",
        "prevalence": 0.87,
        "examples": ["src/api.ts", "src/services/auth.ts"]
      },
      {
        "category": "testing",
        "pattern": "Jest",
        "prevalence": 0.78
      }
    ],
    "topDependencies": ["@react/core", "lodash", "axios", "jest", "webpack"],
    "similarRepositoriesInKG": [
      {
        "kgNodeId": "kg_external_repo_xyz789",
        "semanticSimilarity": 0.82,
        "framework": "react",
        "language": "typescript"
      }
    ]
  },
  "linkedToKG": true,
  "timestamp": 1717935600000
}
```

### Response (Error: Secret Detected)

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "status": "error",
  "code": "SECRETS_DETECTED",
  "message": "Repository contains 2 potential secrets",
  "affectedFiles": ["src/.env.local", "config/secrets.yml"],
  "action": "Remove secrets from repository and retry analysis"
}
```

---

## Implementation: Core Methods

### 1. `async analyzeRepository(request: AnalyzeRequest): Promise<AnalysisResult>`

```typescript
async analyzeRepository(request: AnalyzeRequest) {
  // Step 1: Validate Repomix JSON schema
  validateRepomixSchema(request.repomixJSON);
  
  // Step 2: Check for secrets (fail-fast)
  const secretReport = checkSecrets(request.repomixJSON);
  if (secretReport.detected) {
    throw new SecretDetectedError(secretReport);
  }
  
  // Step 3: Normalize to internal model
  const normalized = this.normalizeRepository({
    externalId: request.externalId,
    sourceType: request.sourceType,
    sourceUrl: request.sourceUrl,
    repomixJSON: request.repomixJSON,
  });
  
  // Step 4: Extract patterns
  normalized.structure.architecture = extractArchitecturePattern(request.repomixJSON);
  normalized.codePatterns = extractCodePatterns(request.repomixJSON);
  normalized.dependencyGraph = extractDependencyGraph(request.repomixJSON);
  
  // Step 5: Convert to KG node
  const kgNode = toKnowledgeGraphNode(normalized);
  
  // Step 6: Ingest into KG
  const ingestionResult = await ckgClient.createNode(kgNode);
  
  // Step 7: Link to existing nodes via similarity
  await linkToExistingArchitectures(kgNode, ckgClient);
  
  // Step 8: Log to telemetry
  codeburnProvider.emit({
    event: 'CIC_REPO_ANALYSIS',
    externalId: request.externalId,
    kgNodeId: ingestionResult.nodeId,
    framework: normalized.structure.framework,
    language: normalized.structure.language,
    architecture: normalized.structure.architecture.pattern,
    codePatternCount: normalized.codePatterns.length,
    timestamp: Date.now(),
  });
  
  return {
    status: 'success',
    kgNodeId: ingestionResult.nodeId,
    analysis: {
      framework: normalized.structure.framework,
      language: normalized.structure.language,
      architecture: normalized.structure.architecture.pattern,
      architectureConfidence: normalized.structure.architecture.confidence,
      codePatterns: normalized.codePatterns,
      topDependencies: normalized.dependencyGraph.topDependencies,
      similarRepositoriesInKG: ingestionResult.linkedNodes,
    },
    linkedToKG: true,
    timestamp: Date.now(),
  };
}
```

### 2. `async normalizeRepository(raw: RawRepoInput): NormalizedRepository`

```typescript
private normalizeRepository(raw: RawRepoInput): NormalizedRepository {
  const { framework, language } = inferLanguageAndFramework(raw.repomixJSON);
  
  return {
    externalId: raw.externalId,
    sourceType: raw.sourceType,
    sourceUrl: raw.sourceUrl,
    ingestedAt: Date.now(),
    structure: {
      framework,
      language,
      buildSystem: inferBuildSystem(raw.repomixJSON),
      architecture: { pattern: 'unknown', confidence: 0, reasoning: '' }, // filled by extractArchitecturePattern
      componentCount: raw.repomixJSON.files.filter(f => f.type === 'file').length,
    },
    codePatterns: [], // filled by extractCodePatterns
    dependencyGraph: { directDependencies: new Map(), topDependencies: [], devVsProduction: { dev: 0, prod: 0 } }, // filled by extractDependencyGraph
  };
}
```

### 3. `checkSecrets(repomixJSON): SecretReport`

```typescript
private checkSecrets(repomixJSON): SecretReport {
  const secretlintReport = repomixJSON.metadata?.secretlintReport || [];
  
  if (secretlintReport.length > 0) {
    return {
      detected: true,
      count: secretlintReport.length,
      affectedFiles: secretlintReport.map(s => s.filePath),
      types: secretlintReport.map(s => s.secretType),
    };
  }
  
  return { detected: false };
}
```

---

## Data Retention & Archival

### Retention Policy

```typescript
interface ExternalRepoRetention {
  hotData: {
    // Recent repos (< 7 days): full node + embeddings + code patterns
    retention: '7 days',
    storage: 'KG in-memory + PostgreSQL',
  },
  warmData: {
    // Medium-age repos (7-90 days): node + embeddings, but code patterns archived
    retention: '90 days',
    storage: 'KG PostgreSQL',
  },
  coldData: {
    // Old repos (> 90 days): compressed snapshot for historical comparison only
    retention: '1 year',
    storage: 'S3 (gzip)',
    fields: ['externalId', 'sourceUrl', 'framework', 'language', 'architecture', 'timestamp'],
  },
}
```

### Archival Flow

```typescript
async archiveOldRepos() {
  // Find repos ingested > 90 days ago
  const oldRepos = await ckgClient.query({
    nodeType: 'ExternalRepository',
    where: { ingestedAt: { $lt: Date.now() - 90 * 24 * 60 * 60 * 1000 } },
  });
  
  for (const repo of oldRepos) {
    // Compress and upload to S3
    const snapshot = {
      externalId: repo.externalId,
      sourceUrl: repo.properties.sourceUrl,
      framework: repo.properties.framework,
      language: repo.properties.language,
      architecture: repo.properties.architecture,
      timestamp: repo.metadata.ingestedAt,
    };
    
    await s3.putObject({
      Bucket: 'cic-repo-archive',
      Key: `repos/${repo.externalId}.json.gz`,
      Body: gzip(JSON.stringify(snapshot)),
    });
    
    // Remove from KG (keep index for historical queries)
    await ckgClient.deleteNode(repo.nodeId);
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('CIC Repomix Bridge', () => {
  describe('Architecture Pattern Detection', () => {
    it('should detect monolithic architecture', () => {
      const repomix = loadTestFixture('monolith-repo.json');
      const pattern = extractArchitecturePattern(repomix);
      expect(pattern.pattern).toBe('monolith');
      expect(pattern.confidence).toBeGreaterThan(0.75);
    });
    
    it('should detect modular architecture', () => {
      const repomix = loadTestFixture('modular-repo.json');
      const pattern = extractArchitecturePattern(repomix);
      expect(pattern.pattern).toBe('modular');
    });
  });
  
  describe('Code Pattern Extraction', () => {
    it('should detect async/await usage', () => {
      const repomix = loadTestFixture('react-repo.json');
      const patterns = extractCodePatterns(repomix);
      const asyncPattern = patterns.find(p => p.pattern === 'async/await');
      expect(asyncPattern.prevalence).toBeGreaterThan(0.5);
    });
    
    it('should detect testing framework', () => {
      const patterns = extractCodePatterns(repomix);
      expect(patterns.some(p => p.category === 'testing')).toBe(true);
    });
  });
  
  describe('KG Integration', () => {
    it('should create KG node from normalized repo', async () => {
      const normalized = createNormalizedRepo();
      const kgNode = toKnowledgeGraphNode(normalized);
      expect(kgNode.nodeType).toBe('ExternalRepository');
      expect(kgNode.properties.framework).toBeDefined();
    });
    
    it('should link similar repos via embeddings', async () => {
      const repo1 = analyzeRepository(testRepoA);
      const repo2 = analyzeRepository(testRepoB);
      
      const edges = await ckgClient.query({
        from: repo1.kgNodeId,
        relationship: 'SIMILAR_TO',
      });
      
      expect(edges.length).toBeGreaterThan(0);
    });
  });
  
  describe('Secret Detection', () => {
    it('should reject repos with secrets', async () => {
      const repomixWithSecret = loadTestFixture('repo-with-secret.json');
      await expect(
        analyzeRepository({ repomixJSON: repomixWithSecret })
      ).rejects.toThrow(SecretDetectedError);
    });
  });
});
```

### E2E Tests

```typescript
describe('Bridge E2E', () => {
  it('should ingest external repo and augment ARL reasoning', async () => {
    // 1. Analyze external repo
    const analysis = await bridge.analyzeRepository({
      externalId: 'github-test-repo',
      sourceUrl: 'https://github.com/test/repo',
      sourceType: 'github',
      repomixJSON: loadFixture('test-repo.json'),
    });
    
    // 2. Retrieve from KG
    const kgNode = await ckgClient.getNode(analysis.kgNodeId);
    expect(kgNode.properties.framework).toBe('react');
    
    // 3. Create an expansion and augment with external patterns
    const expansion = createTestExpansion();
    const augmented = await augmentWithExternalPatterns(expansion, ckgClient, arls);
    
    // 4. Verify ARL signal was boosted
    expect(augmented.arls.semanticAlignment).toBeGreaterThan(expansion.arls.semanticAlignment);
  });
});
```

---

## Deployment Timeline

- **2026-06-09:** Bridge module + KG integration complete
- **2026-06-10:** REST endpoint `/cic/repos/analyze` live
- **2026-06-11:** Testing, validation, ARL signal augmentation verified
- **2026-06-12–13:** Staging: ingest 5 test repos, verify KG linkage
- **2026-06-14:** Production rollout

---

## Success Criteria

- ✅ Analyze external repos without errors
- ✅ Architecture pattern detection: 90%+ accuracy on test corpus
- ✅ Code pattern extraction: all 5 categories (naming, async, testing, docs, error-handling) detected
- ✅ KG node creation: 100% of analyzed repos have searchable KG nodes
- ✅ Semantic linking: similar repos linked with >0.7 cosine similarity
- ✅ ARL augmentation: external patterns measurably boost semantic alignment for relevant expansions
- ✅ Secret detection: 100% of test corpus with secrets caught
- ✅ Performance: analyze 100K-token repo in <5 seconds

