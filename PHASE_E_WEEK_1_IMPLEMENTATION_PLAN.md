# PHASE E WEEK 1 IMPLEMENTATION PLAN
*(Focus: E.0 Persistence + E.1 Caching)*

## WEEK 1 GOAL
**Introduce IExecutionStore + FileExecutionStore + CachedAgentClient**
- Unlock multi-instance deployment
- Achieve 10× speedup on repeated analysis
- Enable graceful restart recovery

---

## DAY 1 — IExecutionStore Interface

### Deliverables
- `src/execution/IExecutionStore.ts` (new)
- `src/execution/ExecutionStoreError.ts` (new)

### Implementation
```typescript
// IExecutionStore.ts
export interface ExecutionState {
  id: string;
  pipelineId: string;
  status: 'running' | 'success' | 'failure' | 'partial';
  startTime: Date;
  endTime?: Date;
  stages: Map<string, StageState>;
  traceId: string;
  correlationId: string;
  metadata: Record<string, unknown>;
}

export interface IExecutionStore {
  loadExecution(id: string): Promise<ExecutionState | null>;
  saveExecution(id: string, state: ExecutionState): Promise<void>;
  listExecutions(filter?: ExecutionFilter): Promise<ExecutionState[]>;
  deleteExecution(id: string): Promise<void>;
}

export interface ExecutionFilter {
  pipelineId?: string;
  status?: string;
  from?: Date;
  to?: Date;
}
```

### Tests
- [ ] `tests/execution/IExecutionStore.contract.test.ts`
  - Load non-existent execution → returns null
  - Save + load round-trip
  - List executions with filters
  - Delete execution
- [ ] Type guards for ExecutionState
- [ ] Mock implementation for unit tests

### Success Criteria
- Interface is stable
- Contract tests pass
- No breaking changes to other code

---

## DAY 2 — FileExecutionStore Implementation

### Deliverables
- `src/execution/FileExecutionStore.ts` (new)
- `.env` template updated with `EXECUTION_STORE_PATH`

### Implementation
```typescript
// FileExecutionStore.ts
export class FileExecutionStore implements IExecutionStore {
  private basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath || process.env.EXECUTION_STORE_PATH || './executions';
    this.ensureDirectory();
  }

  async loadExecution(id: string): Promise<ExecutionState | null> {
    const path = this.getPath(id);
    try {
      const data = await fs.promises.readFile(path, 'utf-8');
      return JSON.parse(data) as ExecutionState;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw new ExecutionStoreError(`Failed to load execution: ${err}`);
    }
  }

  async saveExecution(id: string, state: ExecutionState): Promise<void> {
    const path = this.getPath(id);
    const tmpPath = `${path}.tmp`;
    try {
      await fs.promises.writeFile(tmpPath, JSON.stringify(state, null, 2), 'utf-8');
      await fs.promises.rename(tmpPath, path);
    } catch (err) {
      throw new ExecutionStoreError(`Failed to save execution: ${err}`);
    }
  }

  async listExecutions(filter?: ExecutionFilter): Promise<ExecutionState[]> {
    const files = await fs.promises.readdir(this.basePath);
    const states: ExecutionState[] = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const state = await this.loadExecution(file.slice(0, -5));
      if (state && this.matches(state, filter)) {
        states.push(state);
      }
    }
    return states;
  }

  async deleteExecution(id: string): Promise<void> {
    const path = this.getPath(id);
    try {
      await fs.promises.unlink(path);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new ExecutionStoreError(`Failed to delete execution: ${err}`);
      }
    }
  }

  private getPath(id: string): string {
    return `${this.basePath}/${id}.json`;
  }

  private ensureDirectory(): void {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  private matches(state: ExecutionState, filter?: ExecutionFilter): boolean {
    if (!filter) return true;
    if (filter.pipelineId && state.pipelineId !== filter.pipelineId) return false;
    if (filter.status && state.status !== filter.status) return false;
    if (filter.from && state.startTime < filter.from) return false;
    if (filter.to && state.endTime && state.endTime > filter.to) return false;
    return true;
  }
}
```

### Tests
- [ ] `tests/execution/FileExecutionStore.test.ts`
  - Save + load round-trip
  - Delete removes file
  - Load non-existent returns null
  - List with filters
  - Corruption recovery (malformed JSON → throws)
  - Concurrency safety (basic: ensure atomic writes)

### Success Criteria
- All tests pass
- Atomic writes (no partial files)
- Cleanup on error

---

## DAY 3 — Integrate Store into ContextServer

### Deliverables
- Update `src/server/ContextServer.ts`
- Add persistence hooks

### Changes
```typescript
// In ContextServer constructor
this.executionStore = new FileExecutionStore(
  process.env.EXECUTION_STORE_PATH
);

// Add hooks:
// Before stage execution
async executeStage(stageId: string, ...): Promise<...> {
  const execution = await this.executionStore.loadExecution(this.currentExecutionId);
  // ... execute ...
  execution.stages.set(stageId, { /* stage state */ });
  await this.executionStore.saveExecution(this.currentExecutionId, execution);
}

// On startup: recovery
async startup() {
  const incompleteExecutions = await this.executionStore.listExecutions({
    status: 'running'
  });
  // Log recovered executions
  // Mark as 'partial' if too old
}
```

### Tests
- [ ] `tests/server/ContextServer-persistence.test.ts`
  - Restart recovery (execution restored)
  - Multi-instance simulation (2 instances, separate stores)
  - Partial execution resume
  - Concurrent execution safety

### Success Criteria
- Recovers from shutdown
- No data loss on crash
- Safe for multi-instance

---

## DAY 4 — CachedAgentClient

### Deliverables
- `src/agents/CachedAgentClient.ts` (new)
- Cache key hashing strategy

### Implementation
```typescript
// CachedAgentClient.ts
export class CachedAgentClient implements IAgentClient {
  private cache: Map<string, CacheEntry> = new Map();
  private client: IAgentClient;

  constructor(client: IAgentClient, private ttlMs?: Map<string, number>) {
    this.client = client;
    this.ttlMs = ttlMs || this.defaultTTLs();
  }

  async executeMethod(
    agent: string,
    method: string,
    input: unknown
  ): Promise<unknown> {
    const cacheKey = this.computeCacheKey(agent, method, input);
    const cached = this.cache.get(cacheKey);

    if (cached && !this.isExpired(cached)) {
      return cached.value;
    }

    const result = await this.client.executeMethod(agent, method, input);
    const ttl = this.ttlMs?.get(`${agent}:${method}`) || 300000; // 5min default
    this.cache.set(cacheKey, {
      value: result,
      expiresAt: Date.now() + ttl,
    });

    return result;
  }

  private computeCacheKey(agent: string, method: string, input: unknown): string {
    const inputStr = JSON.stringify(input, Object.keys(input).sort());
    return `${agent}:${method}:${hashSha256(inputStr)}`;
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  private defaultTTLs(): Map<string, number> {
    return new Map([
      ['code-analyzer:analyze', 3600000],     // 1 hour
      ['call-graph:extract', 3600000],        // 1 hour
      ['narrative-linker:link', 600000],      // 10 min
      ['context-synth:synthesize', 600000],   // 10 min
      ['diagnostics:analyze', 300000],        // 5 min
    ]);
  }

  clearCache(): void {
    this.cache.clear();
  }

  getStats(): { hits: number; misses: number; size: number } {
    return {
      hits: this._hits,
      misses: this._misses,
      size: this.cache.size,
    };
  }

  private _hits = 0;
  private _misses = 0;
}

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}
```

### Tests
- [ ] `tests/agents/CachedAgentClient.test.ts`
  - Cache hit returns cached value
  - Cache miss calls underlying client
  - TTL expiry triggers refresh
  - Deterministic cache key (same input → same key)
  - Clear cache empties store

### Success Criteria
- Deterministic cache keys
- TTL enforcement
- No cache pollution

---

## DAY 5 — Integration + Benchmarks

### Deliverables
- Integrate caching into `FlowOrchestrator`
- Admin API: `POST /admin/cache/clear` (requires token)
- Benchmark suite: cold run, warm run, repeated run

### Integration
```typescript
// In FlowOrchestrator
const realClient = new AgentClient(/* config */);
const cachedClient = new CachedAgentClient(realClient);
// Use cachedClient for all stage executions
```

### Admin API
```typescript
// POST /admin/cache/clear
// Header: Authorization: Bearer {ADMIN_TOKEN}
// Response: { cleared: true }
```

### Benchmarks
```bash
# Cold run (empty cache)
npm run benchmark:cic-main -- --cache-mode=cold

# Warm run (cache preloaded)
npm run benchmark:cic-main -- --cache-mode=warm

# Repeated run (cache populated from first run)
npm run benchmark:cic-main -- --cache-mode=repeated

# Expected: 10× speedup warm/repeated vs cold
```

### Tests
- [ ] `tests/integration/cic-main-with-caching.test.ts`
  - Cold run + warm run comparison
  - Cache hit rate verification
  - Speedup measurements

### Success Criteria
- Cold run: ~2–3s (baseline)
- Warm run: ~200–300ms (10× faster)
- 70–90% cache hit rate on repeated flows
- Zero correctness regressions

---

## End-of-Week Gate

### Acceptance Criteria
- [ ] IExecutionStore contract stable
- [ ] FileExecutionStore tested + integrated
- [ ] ContextServer recovers from shutdown
- [ ] CachedAgentClient functional
- [ ] 10× speedup verified
- [ ] All tests green
- [ ] Zero regressions

### Outcome
Ready for Phase E Week 2 (Resilience + Metrics)

---

## Files to Create/Modify
```
NEW:
  src/execution/IExecutionStore.ts
  src/execution/ExecutionStoreError.ts
  src/execution/FileExecutionStore.ts
  src/agents/CachedAgentClient.ts
  tests/execution/IExecutionStore.contract.test.ts
  tests/execution/FileExecutionStore.test.ts
  tests/server/ContextServer-persistence.test.ts
  tests/agents/CachedAgentClient.test.ts
  tests/integration/cic-main-with-caching.test.ts

MODIFY:
  src/server/ContextServer.ts (add persistence hooks)
  src/orchestration/FlowOrchestrator.ts (use CachedAgentClient)
  .env.template (add EXECUTION_STORE_PATH)
  src/server/AdminAPI.ts (add /admin/cache/clear)
```
