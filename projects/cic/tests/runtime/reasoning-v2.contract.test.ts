import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { RetrievalPlanner } from "../../src/reasoning/retrieval-planner.js";
import { EvidenceCollector } from "../../src/reasoning/evidence-collector.js";
import { ReasoningOrchestrator } from "../../src/reasoning/reasoning-orchestrator.js";
import { reasonTraceManager } from "../../src/reasoning/reason-trace.js";
import { entityResolver } from "../../src/linking/entity-resolver.js";
import { graphBuilder } from "../../src/linking/graph-builder.js";
import { VectorIndex } from "../../src/indexer/vector-index.js";
import { SemanticDocument } from "../../src/harvester/extractors/v2/extractor-v2.types.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testTracesDir = path.resolve(__dirname, "../../data/test_traces");

describe("Reasoning Layer Contract Tests (v1.3.2)", () => {
  let planner: RetrievalPlanner;
  let collector: EvidenceCollector;
  let orchestrator: ReasoningOrchestrator;
  let vectorIndex: VectorIndex;

  beforeEach(() => {
    planner = new RetrievalPlanner();
    collector = new EvidenceCollector();
    orchestrator = new ReasoningOrchestrator();
    vectorIndex = new VectorIndex();
    
    // Clear singleton states to guarantee clean isolated tests
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

  describe("RetrievalPlanner", () => {
    it(" Scenario 1: parses semantic queries, triggers graph traversals, and bounds evidence budgets", () => {
      // Seed registry to match recognized entity
      entityResolver.resolve({ name: "Charles Emil Sorensen", type: "PEOPLE", context: "Ford Motor Company" });

      const query = "Analyze the birthplace of Charles Emil Sorensen and historical context.";
      const plan = planner.plan(query, { maxDocuments: 4, maxTokens: 2048 });

      expect(plan.query).toBe(query);
      expect(plan.evidenceBudget.maxDocuments).toBe(4);
      expect(plan.evidenceBudget.maxTokens).toBe(2048);

      // Should identify "Charles Emil Sorensen" in query and append graph queries
      expect(plan.graphQueries).toHaveLength(1);
      expect(plan.graphQueries[0].depth).toBe(2);

      // Should append targeted vector queries for the identified entity
      const targetedVQ = plan.vectorQueries.find(q => q.query === "Charles Emil Sorensen");
      expect(targetedVQ).toBeDefined();
    });
  });

  describe("ContradictionGuard & Orchestrator", () => {
    it("Scenario 2: detects conflicting claims, tags low confidence, and serializes replayable traces", async () => {
      // Seed resolver and graph builder with polar claims
      const ent = entityResolver.resolve({ name: "Charles Sorensen", type: "PEOPLE", context: "Born in Detroit", docId: "doc-D" });
      
      const docD: SemanticDocument = {
        docId: "doc-D",
        rawText: "Charles Sorensen was born in Detroit, Michigan.",
        entities: [ent],
        relationships: [],
        topics: [],
        summary: "Doc D",
        timestamp: new Date().toISOString()
      };
      graphBuilder.addDocumentGraph(docD, []);
      await vectorIndex.upsert(docD);

      // Resolve conflicting alias
      const entConf = entityResolver.resolve({ name: "Charles Sorensen", type: "PEOPLE", context: "Born in Denmark", docId: "doc-E" });
      
      const docE: SemanticDocument = {
        docId: "doc-E",
        rawText: "Charles Sorensen was born in Denmark, Lellinge parish.",
        entities: [entConf],
        relationships: [],
        topics: [],
        summary: "Doc E",
        timestamp: new Date().toISOString()
      };
      graphBuilder.addDocumentGraph(docE, []);
      await vectorIndex.upsert(docE);

      // Execute reasoning query
      const trace = await orchestrator.reason("Retrieve birthplace origins for Charles Sorensen");

      expect(trace.traceId).toBeDefined();
      expect(trace.isContested).toBe(true);
      expect(trace.confidence).toBe("low");
      expect(trace.contradictionsDetected).toHaveLength(1);
      expect(trace.contradictionsDetected[0].severity).toBe("high");
      expect(trace.finalAnswer).toContain("WARNING: Contradictory evidence detected");

      // Verify serialization
      const traceFilePath = reasonTraceManager.save(trace, testTracesDir);
      expect(fs.existsSync(traceFilePath)).toBe(true);

      // Load trace and verify RAG parameters
      const loaded = reasonTraceManager.load(trace.traceId, testTracesDir);
      expect(loaded).not.toBeNull();
      expect(loaded!.query).toBe(trace.query);
      expect(loaded!.finalAnswer).toBe(trace.finalAnswer);
      expect(loaded!.stageLatenciesMs.planning).toBeDefined();
      expect(loaded!.stageLatenciesMs.collection).toBeDefined();
    });
  });
});
