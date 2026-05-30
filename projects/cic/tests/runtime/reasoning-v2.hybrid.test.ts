import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { Harvester } from "../../src/harvester/harvester.js";
import { VectorIndex } from "../../src/indexer/vector-index.js";
import { entityResolver } from "../../src/linking/entity-resolver.js";
import { graphBuilder } from "../../src/linking/graph-builder.js";
import { reasoningOrchestrator } from "../../src/reasoning/reasoning-orchestrator.js";
import { reasonTraceManager } from "../../src/reasoning/reason-trace.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testTracesDir = path.resolve(__dirname, "../../data/test_traces_hybrid");

describe("Reasoning Layer Hybrid Integration Tests (Mode B)", () => {
  let harvester: Harvester;
  let vectorIndex: VectorIndex;

  beforeEach(() => {
    harvester = new Harvester();
    vectorIndex = new VectorIndex();
    
    // Clear runtime states
    entityResolver.clear();
    graphBuilder.clear();

    if (!fs.existsSync(testTracesDir)) {
      fs.mkdirSync(testTracesDir, { recursive: true });
    }
  });

  afterAll(() => {
    try {
      if (fs.existsSync(testTracesDir)) {
        const files = fs.readdirSync(testTracesDir);
        for (const file of files) {
          fs.unlinkSync(path.join(testTracesDir, file));
        }
        fs.rmdirSync(testTracesDir);
      }
    } catch {
      // Ignored
    }
  });

  it("Scenario 3: ingest batches, query end-to-end multi-hop RAG, and verify trace replayability", async () => {
    // 1. Ingest Doc 1: Biography of Charles Sorensen born in Denmark
    await harvester.run({
      type: "semantic",
      payload: {
        docId: "doc-bio-1",
        raw: "Charles Sorensen was born in Denmark, Lellinge parish. He was a pioneer in mass production."
      }
    });

    // 2. Ingest Doc 2: Relational association with Ford
    await harvester.run({
      type: "semantic",
      payload: {
        docId: "doc-bio-2",
        raw: "Charles Sorensen emigrated to America and worked at Ford Motor Company."
      }
    });

    // Assert graph builder loaded both documents and resolved entity
    const summary = graphBuilder.getSummary();
    expect(summary.nodes.documents).toBe(2);
    expect(summary.nodes.entities).toBeGreaterThanOrEqual(1);

    // 3. Execute End-to-End reasoning RAG query
    const trace = await reasoningOrchestrator.reason("Analyze emigration and company worked at for Charles Sorensen");
    
    expect(trace.traceId).toBeDefined();
    expect(trace.query).toContain("emigration");
    expect(trace.evidenceEvaluated).toHaveLength(2); // Should pull both valid biography documents
    expect(trace.finalAnswer).toContain("Ford Motor Company");

    // 4. Save trace to temporary trace dir
    const traceFilePath = reasonTraceManager.save(trace, testTracesDir);
    expect(fs.existsSync(traceFilePath)).toBe(true);

    // 5. Simulate Trace Replay
    const loadedTrace = reasonTraceManager.load(trace.traceId, testTracesDir);
    expect(loadedTrace).not.toBeNull();

    // Replay with new budget constraints (maxDocuments: 1)
    const replayedTrace = await reasoningOrchestrator.reason(loadedTrace!.query, {
      timeWindow: loadedTrace!.plan.temporalSlice,
      maxDocuments: 1,
      maxTokens: loadedTrace!.plan.evidenceBudget.maxTokens
    });

    expect(replayedTrace.query).toBe(loadedTrace!.query);
    expect(replayedTrace.plan.evidenceBudget.maxDocuments).toBe(1);
    expect(replayedTrace.evidenceEvaluated).toHaveLength(1); // Budget capped at 1 document!
    expect(replayedTrace.traceId).not.toBe(loadedTrace!.traceId); // New trace ID compiled
  });
});
