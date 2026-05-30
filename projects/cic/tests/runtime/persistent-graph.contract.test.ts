import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { EntityResolver } from "../../src/linking/entity-resolver.js";
import { GraphBuilder } from "../../src/linking/graph-builder.js";
import { SemanticDocument } from "../../src/harvester/extractors/v2/extractor-v2.types.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDataDir = path.resolve(__dirname, "../../data/test_run");
const testRegistryPath = path.join(testDataDir, "entity-registry.test.json");
const testGraphPath = path.join(testDataDir, "graph-store.test.json");

describe("Persistent Graph Contract Tests", () => {
  let entityResolver: EntityResolver;
  let graphBuilder: GraphBuilder;

  beforeEach(() => {
    entityResolver = new EntityResolver();
    entityResolver.clear();
    graphBuilder = new GraphBuilder();
    graphBuilder.clear();

    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Cleanup test folder
    try {
      if (fs.existsSync(testRegistryPath)) fs.unlinkSync(testRegistryPath);
      if (fs.existsSync(testGraphPath)) fs.unlinkSync(testGraphPath);
      if (fs.existsSync(testDataDir)) fs.rmdirSync(testDataDir);
    } catch {
      // Ignored
    }
  });

  it("Scenario 1: supports direct disk-backed serialization and roundtrip", () => {
    const docA: SemanticDocument = {
      docId: "doc-A",
      rawText: "Charles Sorensen was born in Denmark.",
      entities: [
        { id: "ent_charles", name: "Charles Sorensen", type: "PEOPLE", context: "Birth record", confidence: 0.95 }
      ],
      relationships: [],
      topics: [],
      summary: "Doc A Summary",
      timestamp: new Date().toISOString()
    };

    entityResolver.resolve({ name: "Charles Sorensen", type: "PEOPLE", context: "Birth record", docId: "doc-A" });
    graphBuilder.addDocumentGraph(docA, []);

    // Save to test paths
    entityResolver.save(testRegistryPath);
    graphBuilder.save(testGraphPath);

    expect(fs.existsSync(testRegistryPath)).toBe(true);
    expect(fs.existsSync(testGraphPath)).toBe(true);

    // Clear in-memory maps
    entityResolver.clear();
    graphBuilder.clear();
    expect(entityResolver.getCanonicalEntities()).toHaveLength(0);
    expect(graphBuilder.getSummary().nodes.documents).toBe(0);

    // Load from disk
    entityResolver.load(testRegistryPath);
    graphBuilder.load(testGraphPath);

    // Assert roundtrip integrity
    expect(entityResolver.getCanonicalEntities()).toHaveLength(1);
    expect(entityResolver.getCanonicalEntities()[0].name).toBe("Charles Sorensen");
    
    const summary = graphBuilder.getSummary();
    expect(summary.nodes.documents).toBe(1);
    expect(summary.nodes.entities).toBe(1);
  });

  it("Scenario 2: logs granular entity alias lineages chronologically", () => {
    // 1. Creation event
    const e1 = entityResolver.resolve({ name: "Sorensen, Charles Emil", type: "PEOPLE", context: "Birth", docId: "doc-1" });
    expect(e1.lineage).toBeDefined();
    expect(e1.lineage).toHaveLength(1);
    expect(e1.lineage![0].action).toBe("created");
    expect(e1.lineage![0].docId).toBe("doc-1");

    // 2. Context enrichment event
    const e2 = entityResolver.resolve({ name: "Charles Emil Sorensen", type: "PEOPLE", context: "Emigration", docId: "doc-2" });
    expect(e2.id).toBe(e1.id);
    expect(e2.lineage).toHaveLength(2);
    expect(e2.lineage![1].action).toBe("context_enriched");
    expect(e2.lineage![1].contextAdded).toBe("Emigration");

    // 3. Merged alias event (no new context)
    const e3 = entityResolver.resolve({ name: "Charles Sorensen", type: "PEOPLE", context: "Emigration", docId: "doc-3" });
    expect(e3.id).toBe(e1.id);
    expect(e3.lineage).toHaveLength(3);
    expect(e3.lineage![2].action).toBe("merged_alias");
    expect(e3.lineage![2].originalName).toBe("Charles Sorensen");

    // 4. Canonical name update event (longer alias)
    const e4 = entityResolver.resolve({ name: "Charles Emil Sorensen III", type: "PEOPLE", context: "Emigration", docId: "doc-4" });
    expect(e4.id).toBe(e1.id);
    expect(e4.name).toBe("Charles Emil Sorensen III");
    expect(e4.lineage).toHaveLength(4);
    expect(e4.lineage![3].action).toBe("name_updated");
    expect(e4.lineage![3].originalName).toBe("Charles Emil Sorensen");
  });

  it("Scenario 3: reconstructs historical graph states dynamically via temporal slicing", () => {
    const t1 = "2026-05-30T10:00:00.000Z";
    const t2 = "2026-05-30T11:00:00.000Z";
    const t3 = "2026-05-30T12:00:00.000Z";

    // Step A: Ingest Doc A at T1 (Entity "Charles", name "Charles", context "Birth")
    const entA = entityResolver.resolve({ name: "Charles", type: "PEOPLE", context: "Birth", docId: "doc-A" });
    // Adjust lineage timestamps to mock historical ingestion dates
    entA.lineage![0].timestamp = t1;

    const docA: SemanticDocument = {
      docId: "doc-A",
      rawText: "Charles was born.",
      entities: [entA],
      relationships: [],
      topics: [],
      summary: "T1 Doc",
      timestamp: t1
    };
    graphBuilder.addDocumentGraph(docA, []);

    // Step B: Ingest Doc B at T2 (Entity alias "Charles Sorensen", context "School")
    const entB = entityResolver.resolve({ name: "Charles Sorensen", type: "PEOPLE", context: "School", docId: "doc-B" });
    // Adjust lineage timestamps for T2
    entB.lineage![1].timestamp = t2; // Context enrichment
    entB.lineage![2].timestamp = t2; // Name updated

    const docB: SemanticDocument = {
      docId: "doc-B",
      rawText: "Charles Sorensen went to school.",
      entities: [entB],
      relationships: [],
      topics: [],
      summary: "T2 Doc",
      timestamp: t2
    };
    graphBuilder.addDocumentGraph(docB, []);

    // Step C: Ingest Doc C at T3 (Entity alias "Charles Emil Sorensen", context "Work")
    const entC = entityResolver.resolve({ name: "Charles Emil Sorensen", type: "PEOPLE", context: "Work", docId: "doc-C" });
    // Adjust lineage timestamps for T3
    entC.lineage![3].timestamp = t3; // Context enrichment
    entC.lineage![4].timestamp = t3; // Name updated

    const docC: SemanticDocument = {
      docId: "doc-C",
      rawText: "Charles Emil Sorensen worked hard.",
      entities: [entC],
      relationships: [],
      topics: [],
      summary: "T3 Doc",
      timestamp: t3
    };
    graphBuilder.addDocumentGraph(docC, []);

    // SLICE 1: At T1 (10:00 AM)
    const sliceT1 = graphBuilder.sliceAtDate("2026-05-30T10:30:00.000Z");
    expect(sliceT1.documents).toHaveLength(1);
    expect(sliceT1.documents[0].docId).toBe("doc-A");
    expect(sliceT1.entities).toHaveLength(1);
    expect(sliceT1.entities[0].name).toBe("Charles");
    expect(sliceT1.entities[0].context).toBe("Birth");

    // SLICE 2: At T2 (11:00 AM)
    const sliceT2 = graphBuilder.sliceAtDate("2026-05-30T11:30:00.000Z");
    expect(sliceT2.documents).toHaveLength(2);
    expect(sliceT2.documents.map(d => d.docId)).toContain("doc-A");
    expect(sliceT2.documents.map(d => d.docId)).toContain("doc-B");
    expect(sliceT2.entities).toHaveLength(1);
    expect(sliceT2.entities[0].name).toBe("Charles Sorensen");
    expect(sliceT2.entities[0].context).toBe("Birth School");

    // SLICE 3: At T3 (12:00 PM)
    const sliceT3 = graphBuilder.sliceAtDate("2026-05-30T12:30:00.000Z");
    expect(sliceT3.documents).toHaveLength(3);
    expect(sliceT3.entities[0].name).toBe("Charles Emil Sorensen");
    expect(sliceT3.entities[0].context).toBe("Birth School Work");
  });
});
