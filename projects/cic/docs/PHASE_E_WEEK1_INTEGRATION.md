# Phase E Week 1 — Integration Plan

**Status:** Ready for implementation  
**Target:** E.0a + E.1 (Execution persistence + Agent caching)  
**Timeline:** 5 days

---

## E.0a — Execution State Persistence

### Artifacts Created

1. **[IExecutionStore.ts](../src/ruflo-orchestration/IExecutionStore.ts)** ✅
   - Interface definition
   - 8 core methods: save, update, get, list, delete, archive, addSpan, updateSpan
   - Support for filtering, pagination, retention policies

2. **[FileExecutionStore.ts](../src/ruflo-orchestration/FileExecutionStore.ts)** ✅
   - Full implementation
   - JSON-backed persistence
   - Automatic directory creation
   - Configurable via `EXECUTION_STORE_PATH` env var
   - Supports archival (move old executions to cold storage)

### Integration Points (Next)

#### 1. FlowRegistry — Constructor & Initialization

**Current:**
```typescript
export class FlowRegistry {
  private templates: Map<string, FlowTemplate>;
  private executions: Map<string, FlowExecution>;  // ← MEMORY ONLY
}
```

**Target:**
```typescript
export class FlowRegistry {
  private templates: Map<string, FlowTemplate>;
  private executions: Map<string, FlowExecution>;  // ← KEEP AS CACHE
  private store: IExecutionStore;  // ← ADD PERSISTENT STORE
  
  constructor(store?: IExecutionStore) {
    this.store = store || new MemoryExecutionStore(); // fallback for tests
    // Load recent executions from store into memory cache
    this.loadExecutionsFromStore();
  }
}
```

#### 2. FlowRegistry — Mutations Must Go Through Store

**Current:**
```typescript
saveExecution(execution: FlowExecution): void {
  this.executions.set(execution.id, execution);
}
```

**Target:**
```typescript
async saveExecution(execution: FlowExecution): Promise<void> {
  this.executions.set(execution.id, execution); // keep in-memory cache
  await this.store.save(execution); // ← PERSIST TO STORE
}

async updateExecution(
  executionId: string,
  updates: Partial<FlowExecution>
): Promise<void> {
  const execution = this.executions.get(executionId);
  if (!execution) throw new Error(`Execution not found: ${executionId}`);
  
  const updated = { ...execution, ...updates };
  this.executions.set(executionId, updated);
  await this.store.update(executionId, updates); // ← PERSIST UPDATES
}
```

#### 3. ContextServer — Initialize With FileExecutionStore

**Current:**
```typescript
const registry = new FlowRegistry();
```

**Target:**
```typescript
import { FileExecutionStore } from "../src/ruflo-orchestration/FileExecutionStore.js";

const executionStore = new FileExecutionStore({
  basePath: process.env.EXECUTION_STORE_PATH || "./executions",
  retentionDays: 30,
});

const registry = new FlowRegistry(executionStore);
```

#### 4. Span Recording — Must Persist Spans

**Current:**
```typescript
execution.spans.push(span);  // ← IN-MEMORY ONLY
```

**Target:**
```typescript
execution.spans.push(span);
await this.store.addSpan(execution.id, span);  // ← PERSIST SPAN
```

### Testing E.0a

**Unit Test:** `src/ruflo-orchestration/__tests__/FileExecutionStore.test.ts`
```typescript
import { FileExecutionStore } from "../FileExecutionStore.js";
import { FlowExecution } from "../IExecutionStore.js";

describe("FileExecutionStore", () => {
  let store: FileExecutionStore;
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "executions-"));
    store = new FileExecutionStore({ basePath: testDir });
  });

  it("saves and retrieves executions", async () => {
    const execution: FlowExecution = {
      id: "exec-test-001",
      template_id: "flow-analyze-repository-v1",
      status: "completed",
      input: { context_id: "ctx-001" },
      stage_status: {},
      spans: [],
      created_at: new Date().toISOString(),
      trace_id: "trace-001",
    };

    await store.save(execution);
    const retrieved = await store.get("exec-test-001");

    expect(retrieved).toEqual(execution);
  });

  it("lists executions with filters", async () => {
    // Create 3 executions
    // List with filter: template_id === "flow-analyze-repository-v1"
    // Assert count === 1
  });

  it("archives old executions", async () => {
    // Create execution with created_at 31 days ago
    // Call archive(olderThanDays: 30)
    // Assert execution moved to archived/ subdirectory
  });
});
```

---

## E.1 — Agent Result Caching

### Artifacts to Create (Days 3-5)

1. **[IAgentCache.ts](../src/ruflo-orchestration/IAgentCache.ts)**
   ```typescript
   export interface IAgentCache {
     get(key: string): Promise<Record<string, unknown> | null>;
     put(key: string, value: Record<string, unknown>, ttlMs?: number): Promise<void>;
     invalidate(keyPattern: string): Promise<number>;  // tag-based invalidation
     clear(): Promise<void>;
   }
   ```

2. **[MemoryAgentCache.ts](../src/ruflo-orchestration/MemoryAgentCache.ts)**
   - In-memory LRU cache
   - TTL support with automatic expiry
   - Tag-based invalidation (e.g., "context:ctx-001", "file:src/agents")

3. **[CachedAgentClient.ts](../src/ruflo-orchestration/CachedAgentClient.ts)**
   - Wrapper around AgentClient
   - Transparent caching layer
   - Cache key = hash(agent, method, input)
   - Per-agent TTL configuration

### Cache Configuration

```typescript
// config/agent-cache.yaml (or env vars)
cache:
  enabled: true
  ttl:
    code-analyzer: 3600000      # 1 hour
    call-graph-extractor: 1800000  # 30 min
    narrative-linker: 300000    # 5 min
    idea-parser: 300000        # 5 min
    default: 600000            # 10 min
  invalidation:
    tags:
      - "context:*"             # invalidate on context changes
      - "file:*"                # invalidate on file changes
```

### Integration into FlowOrchestrator

**Current:**
```typescript
const agent = agents[agentName];
const result = await agent.invoke(method, input, traceId);
```

**Target:**
```typescript
const agent = new CachedAgentClient(
  agents[agentName],
  cache,
  { ttl: agentCacheTTLs[agentName] }
);
const result = await agent.invoke(method, input, traceId);
```

---

## Week 1 Milestone

### By End of Day 2 (E.0a Complete)
- [ ] Modify FlowRegistry to use IExecutionStore
- [ ] Update ContextServer initialization
- [ ] Ensure all mutations call store.* methods
- [ ] Run integration test: execute flow, verify JSON file created
- [ ] Commit: `[claude] E.0a: Execution state persistence (FileExecutionStore)`

### By End of Day 4 (E.1 Complete)
- [ ] Implement IAgentCache + MemoryAgentCache
- [ ] Implement CachedAgentClient wrapper
- [ ] Wire into FlowOrchestrator
- [ ] Add cache metrics collection
- [ ] Run load test: compare cache hit rate before/after
- [ ] Commit: `[claude] E.1: Agent result caching (MemoryAgentCache + CachedAgentClient)`

### By End of Day 5 (Buffer/Testing)
- [ ] Verify multi-instance scenario: run 2 ContextServer instances, share executions via FileExecutionStore
- [ ] Load test: 10 parallel flows, measure cache hit rate
- [ ] Document cache invalidation API
- [ ] Commit: `[claude] E.0/E.1: Integration tests + multi-instance validation`

---

## Next Action

**Start immediately:** Modify [FlowRegistry.ts](../src/ruflo-orchestration/FlowRegistry.ts) to accept IExecutionStore and change all `saveExecution()` / `updateExecution()` calls to async.

**Estimated effort:** 1 hour (read the file, identify mutation points, add store calls)

---

## Rollback Plan

If something breaks:
1. In-memory Map cache is still available (FlowRegistry keeps it)
2. FileExecutionStore is optional (pass null to use test MemoryExecutionStore)
3. All mutations are *additive* (no breaking changes to interfaces)

---

## Metrics to Track

After E.0a:
- **Execution persistence latency** (save/update/addSpan call time)
- **Disk usage** (executions directory size)
- **Failed mutations** (save, update errors)

After E.1:
- **Cache hit rate** (hits / total invocations)
- **Cache size** (memory used)
- **Agent latency** (cached vs uncached comparison)
