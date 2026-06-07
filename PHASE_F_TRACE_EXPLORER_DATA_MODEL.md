# PHASE F TRACE EXPLORER DATA MODEL
*(Canonical representation for trace visualization)*

This model is the foundation for all Phase F trace operations: waterfall view, flamegraph, diffing, and drift overlays.

---

## Core Objects

### Trace
```typescript
interface Trace {
  // Identity
  traceId: string;                    // "cic-2026-06-06T13:25:44Z-001"
  
  // Timing
  startTime: number;                  // milliseconds since epoch
  endTime: number;                    // milliseconds since epoch
  durationMs: number;                 // endTime - startTime
  
  // Payload
  spans: Span[];                      // ordered by startTime
  
  // Metadata
  metadata: {
    pipeline: string;                 // "cic-main-pipeline"
    commit: string;                   // "a7c3e12"
    correlationId: string;            // for cross-system tracing
  };
}
```

### Span
```typescript
interface Span {
  // Identity
  spanId: string;                     // "span-1-code-analyzer"
  parentSpanId: string | null;        // parent span ID or null for root
  
  // Semantics
  name: string;                       // "Code Analyzer"
  agent: string;                      // "summarizer"
  method: string;                     // "analyze"
  
  // Timing
  startTime: number;                  // milliseconds since epoch
  endTime: number;
  durationMs: number;                 // endTime - startTime
  
  // Status
  status: "ok" | "error";
  
  // Resilience Signals
  retryCount: number;                 // 0-3
  breakerState: "closed" | "open" | "half-open";
  
  // Tracing
  correlationId: string;
  
  // Custom Attributes
  attributes: Record<string, any>;    // agent-specific metadata
  
  // Error Details (if status === "error")
  error?: {
    type: string;                     // "TimeoutError"
    message: string;
    metadata: Record<string, any>;    // error envelope fields
  };
}
```

---

## Derived Views

### Waterfall (Depth-First Tree)
```typescript
interface WaterfallNode {
  span: Span;
  children: WaterfallNode[];
  depth: number;
  isExpanded: boolean;
}

function buildWaterfall(trace: Trace): WaterfallNode[] {
  const spanMap = new Map(trace.spans.map(s => [s.spanId, s]));
  const rootSpans = trace.spans.filter(s => !s.parentSpanId);
  
  return rootSpans.map(span => buildNode(span, spanMap, 0));
}

function buildNode(span: Span, spanMap: Map, depth: number): WaterfallNode {
  const children = spanMap
    .values()
    .filter(s => s.parentSpanId === span.spanId)
    .map(s => buildNode(s, spanMap, depth + 1));
  
  return { span, children, depth, isExpanded: depth < 3 };
}
```

### Flamegraph (Stacked Bar)
```typescript
interface FlamegraphFrame {
  name: string;
  durationMs: number;
  startOffsetMs: number;
  color: string;               // based on status
  children: FlamegraphFrame[];
}

function buildFlamegraph(trace: Trace): FlamegraphFrame[] {
  // Convert waterfall to stacked-bar representation
  // Used for width-proportional rendering
}
```

### Timeline (Gantt)
```typescript
interface TimelineBar {
  spanId: string;
  name: string;
  startMs: number;             // milliseconds from trace start
  durationMs: number;
  y: number;                   // vertical position (row)
  color: string;
  status: "ok" | "error" | "retrying" | "breaker-open";
}

function buildTimeline(trace: Trace): TimelineBar[] {
  const minTime = trace.startTime;
  
  return trace.spans.map(span => ({
    spanId: span.spanId,
    name: span.name,
    startMs: span.startTime - minTime,
    durationMs: span.durationMs,
    y: getVerticalPosition(span),
    color: getColor(span),
    status: getStatus(span)
  }));
}
```

---

## Diff Model

### TraceDiff
```typescript
interface TraceDiff {
  // Metadata
  beforeTraceId: string;
  afterTraceId: string;
  
  // Deltas
  addedSpans: Span[];                 // in after, not in before
  removedSpans: Span[];               // in before, not in after
  changedSpans: SpanDelta[];
}

interface SpanDelta {
  spanId: string;
  before: Span;
  after: Span;
  deltas: {
    durationMs?: number;              // delta in milliseconds
    retryCountDelta?: number;
    breakerStateChanged?: boolean;
    statusChanged?: boolean;
  };
}
```

### Diff Visualization
```typescript
function computeDiff(trace1: Trace, trace2: Trace): TraceDiff {
  const span1Map = new Map(trace1.spans.map(s => [s.spanId, s]));
  const span2Map = new Map(trace2.spans.map(s => [s.spanId, s]));
  
  const addedSpans = Array.from(span2Map.values())
    .filter(s => !span1Map.has(s.spanId));
  
  const removedSpans = Array.from(span1Map.values())
    .filter(s => !span2Map.has(s.spanId));
  
  const changedSpans = Array.from(span1Map.entries())
    .filter(([id]) => span2Map.has(id))
    .map(([id, before]) => ({
      spanId: id,
      before,
      after: span2Map.get(id)!,
      deltas: computeDeltas(before, span2Map.get(id)!)
    }));
  
  return { beforeTraceId: trace1.traceId, afterTraceId: trace2.traceId, addedSpans, removedSpans, changedSpans };
}

function computeDeltas(before: Span, after: Span) {
  return {
    durationMs: after.durationMs !== before.durationMs ? after.durationMs - before.durationMs : undefined,
    retryCountDelta: after.retryCount !== before.retryCount ? after.retryCount - before.retryCount : undefined,
    breakerStateChanged: after.breakerState !== before.breakerState,
    statusChanged: after.status !== before.status
  };
}
```

---

## Drift Overlay Model

### Drift Annotation
```typescript
interface DriftAnnotation {
  spanId: string;
  type: "classification_change" | "artifact_change" | "governance_change";
  before: any;
  after: any;
  severity: "info" | "warning" | "critical";
  metadata: Record<string, any>;
}

function overlayDrift(trace: Trace, reclassificationChanges: DriftAnnotation[]): Trace {
  const annotationMap = new Map(
    reclassificationChanges.map(a => [a.spanId, a])
  );
  
  return {
    ...trace,
    spans: trace.spans.map(span => ({
      ...span,
      drift: annotationMap.get(span.spanId)
    }))
  };
}
```

---

## Rendering Strategy

### Waterfall Rendering
```javascript
function renderWaterfall(waterfallNode, depth = 0) {
  const indent = depth * 20;
  const span = waterfallNode.span;
  const color = span.status === 'ok' ? 'green' : 'red';
  
  return `
    <div class="waterfall-node" style="margin-left: ${indent}px">
      <div class="span-bar" style="background: ${color}; width: ${span.durationMs}px;">
        ${span.name} (${span.durationMs}ms)
      </div>
      ${waterfallNode.children.map(child => renderWaterfall(child, depth + 1)).join('')}
    </div>
  `;
}
```

### Flamegraph Rendering
```javascript
function renderFlamegraph(frame, x = 0, y = 0, width = 1000) {
  const frameWidth = (frame.durationMs / totalDuration) * width;
  
  return `
    <g class="frame" transform="translate(${x}, ${y})">
      <rect width="${frameWidth}" height="20" fill="${frame.color}" />
      <text x="4" y="14" font-size="12">${frame.name}</text>
      ${frame.children.map((child, idx) => {
        const childX = idx === 0 ? 0 : frame.children.slice(0, idx).reduce((sum, c) => sum + getWidth(c), 0);
        return renderFlamegraph(child, childX, y + 25, frameWidth);
      }).join('')}
    </g>
  `;
}
```

---

## API Contracts

### GET /api/traces/{traceId}
Returns: `Trace`

### GET /api/traces?limit=10
Returns: `Trace[]`

### POST /api/traces/diff
Body:
```json
{
  "traceId1": "abc123",
  "traceId2": "def456"
}
```
Returns: `TraceDiff`

### GET /api/traces/{traceId}/waterfall
Returns: `WaterfallNode[]`

### GET /api/traces/{traceId}/flamegraph
Returns: `FlamegraphFrame[]`

### GET /api/reclassification/drift?traceId=abc123
Returns: `DriftAnnotation[]`

---

## Performance Considerations

### Trace Size
- Typical trace: 19 spans (~5KB JSON)
- Max spans per trace: 100
- Traces cached in browser for 1 hour

### Rendering
- Waterfall: O(n) DOM nodes, DOM-fast
- Flamegraph: O(n) SVG elements, canvas-alternative preferred for n > 500
- Diff: O(n + m) where n = before spans, m = after spans

### Memory
- Single trace: ~5–50KB
- Trace list (10 traces): ~50–500KB
- Trace cache (100 traces): ~500KB–5MB

---

## Type Safety

All operations validate against these constraints:
- `spanId` must be unique within trace
- `parentSpanId` must exist in same trace (or be null)
- `startTime` ≤ `endTime` for all spans
- No circular parent-child relationships
- Span tree must be acyclic

Validation on load:
```typescript
function validateTrace(trace: Trace): boolean {
  const spans = trace.spans;
  const idSet = new Set(spans.map(s => s.spanId));
  
  return spans.every(span => {
    if (span.parentSpanId && !idSet.has(span.parentSpanId)) return false;
    if (span.startTime > span.endTime) return false;
    return true;
  });
}
```
