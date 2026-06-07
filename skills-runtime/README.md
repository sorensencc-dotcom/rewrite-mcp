# Skill Runtime

The Skill Runtime is a unified execution layer for the Shared Skills Library.

**Version:** 1.0.0  
**Status:** Production Ready

---

## Quick Start

```javascript
import { runtime } from "./skills-runtime/index.js";

// Invoke a skill with automatic validation, sandboxing, and telemetry
const result = await runtime.invokeSkill("cic-section-summarizer", {
  sectionId: "phase-44.0",
  files: ["file1.ts", "file2.ts"]
});

console.log(result);
```

---

## Features

### 1. Skill Loading
- Lazy loads skills on demand
- Caches loaded skills for performance
- Validates skill entry points

```javascript
const skills = await runtime.getAvailableSkills();
const claudeSkills = await runtime.getSkillsByPlatform("claude");
```

### 2. Payload Validation
- Validates inputs against JSON schemas
- Provides detailed error messages
- Prevents invalid skill execution

```javascript
const manifest = await runtime.getManifest();
// All schemas available via manifest
```

### 3. Sandboxed Execution
- Enforces timeouts (default 30s)
- Supports automatic retries
- Catches and reports errors

```javascript
const result = await runtime.invokeSkill("my-skill", payload, {
  timeout: 60000,  // 60 second timeout
  retries: 3       // Retry up to 3 times
});
```

### 4. Telemetry Collection
- Records all invocations
- Tracks success/failure rates
- Measures performance metrics

```javascript
const metrics = runtime.getMetrics("cic-section-summarizer");
console.log(metrics.averageDuration); // ms

const telemetry = runtime.getTelemetry(); // Full report
```

### 5. Dependency Management
- Tracks skill dependencies
- Detects circular dependencies
- Provides execution order

```javascript
const deps = runtime.getDependencies("cic-roadmap-updater");
console.log(deps); // ["cic-section-summarizer"]

const allDeps = runtime.getTransitiveDependencies("my-skill");
console.log(runtime.hasCycles()); // false
```

### 6. Shared Context
- Store and retrieve context across skills
- TTL support for automatic cleanup
- Namespaced storage

```javascript
// Store data in context
runtime.setContext("myNamespace", "key", { data: "value" }, 60000); // 60s TTL

// Retrieve from context
const value = runtime.getContext("myNamespace");
```

---

## API Reference

### `runtime.invokeSkill(skillName, payload, options)`

Invoke a skill with full runtime support.

**Parameters:**
- `skillName` (string) — Name of the skill
- `payload` (object) — Input data for skill
- `options` (object, optional)
  - `timeout` (number) — Execution timeout in ms (default: 30000)
  - `retries` (number) — Number of retries (default: 0)

**Returns:** Promise<result>

**Throws:** Error if skill not found, payload invalid, or execution fails

```javascript
const result = await runtime.invokeSkill("agent-drift-detector", {
  agentName: "test-agent",
  expectedSchema: { a: 1 },
  actualSchema: { a: 1, b: 2 }
});
```

---

### `runtime.getDependencies(skillName)`

Get direct dependencies of a skill.

**Returns:** Array<string>

```javascript
const deps = runtime.getDependencies("cic-roadmap-updater");
// ["cic-section-summarizer"]
```

---

### `runtime.getTransitiveDependencies(skillName)`

Get all transitive dependencies.

**Returns:** Array<string>

```javascript
const allDeps = runtime.getTransitiveDependencies("docs-sync-release");
// ["doc-update", "operator-grade-procedures"]
```

---

### `runtime.hasCycles()`

Check if dependency graph has cycles.

**Returns:** boolean

```javascript
if (runtime.hasCycles()) {
  console.warn("Circular dependencies detected");
}
```

---

### `runtime.getTelemetry(skillName?)`

Get telemetry data.

**Parameters:**
- `skillName` (string, optional) — Specific skill or all

**Returns:** Object with summary, invocations, errors, metrics

```javascript
const allTelemetry = runtime.getTelemetry();
const skillTelemetry = runtime.getTelemetry("cic-section-summarizer");
```

---

### `runtime.setContext(namespace, key, value, ttlMs?)`

Store data in shared context.

**Parameters:**
- `namespace` (string) — Context namespace
- `key` (string) — Data key
- `value` (any) — Data value
- `ttlMs` (number, optional) — Time-to-live in ms

**Returns:** value

```javascript
runtime.setContext("pipeline", "currentPhase", "phase-44.0", 3600000); // 1 hour TTL
```

---

### `runtime.getContext(namespace)`

Retrieve all data in a namespace.

**Parameters:**
- `namespace` (string) — Context namespace

**Returns:** Object with all keys/values

```javascript
const pipelineContext = runtime.getContext("pipeline");
// { currentPhase: "phase-44.0", ... }
```

---

## Configuration

```javascript
const runtime = new SkillRuntime({
  timeout: 60000,    // Default timeout for all skills
  retries: 2,        // Default retries for all skills
  telemetry: true    // Enable/disable telemetry collection
});
```

---

## Error Handling

All errors during skill execution include:
- Skill name
- Error message
- Error type
- Timestamp
- Payload size

```javascript
try {
  await runtime.invokeSkill("my-skill", payload);
} catch (err) {
  console.error(`Skill error: ${err.message}`);
  const telemetry = runtime.getTelemetry("my-skill");
  console.log(telemetry.errors); // View all errors
}
```

---

## Modules

The runtime consists of:

- **loader.js** — Skill loading and caching
- **validator.js** — Payload validation
- **sandbox.js** — Sandboxed execution with timeouts
- **telemetry.js** — Performance and error tracking
- **context.js** — Shared state management
- **dependency-graph.js** — Dependency tracking

---

## Best Practices

1. **Always use the runtime for invocation**
   - Ensures validation, sandboxing, and telemetry
   - Prevents invalid states

2. **Set appropriate timeouts**
   - Default 30s may be too short for long operations
   - Use `timeout` option for skills that need more time

3. **Monitor telemetry**
   - Review metrics regularly
   - Track error patterns
   - Optimize slow skills

4. **Use context for shared state**
   - Avoid global variables
   - Set TTLs to prevent memory leaks
   - Keep namespaces organized

5. **Validate dependencies**
   - Run `runtime.validateDependencies()` during setup
   - Check for cycles with `runtime.hasCycles()`
   - Keep dependency graph clean

---

**Last updated:** 2026-06-05 | **Version:** 1.0.0
