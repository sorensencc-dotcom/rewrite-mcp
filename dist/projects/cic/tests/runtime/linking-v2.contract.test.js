"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const entity_resolver_js_1 = require("../../src/linking/entity-resolver.js");
const link_engine_js_1 = require("../../src/linking/link-engine.js");
const graph_builder_js_1 = require("../../src/linking/graph-builder.js");
(0, vitest_1.describe)("Cross-Document Linking Contract", () => {
    let entityResolver;
    let linkEngine;
    let graphBuilder;
    (0, vitest_1.beforeEach)(() => {
        entityResolver = new entity_resolver_js_1.EntityResolver();
        linkEngine = new link_engine_js_1.LinkEngine();
        graphBuilder = new graph_builder_js_1.GraphBuilder();
    });
    (0, vitest_1.describe)("EntityResolver", () => {
        (0, vitest_1.it)("canonicalizes entity names correctly", () => {
            (0, vitest_1.expect)((0, entity_resolver_js_1.canonicalizeName)("Sorensen, Charles Emil")).toBe("Charles Emil Sorensen");
            (0, vitest_1.expect)((0, entity_resolver_js_1.canonicalizeName)("  Charles   Emil Sorensen  ")).toBe("Charles Emil Sorensen");
        });
        (0, vitest_1.it)("creates matching comparison keys", () => {
            const key1 = (0, entity_resolver_js_1.getComparisonKey)("Sorensen, Charles Emil");
            const key2 = (0, entity_resolver_js_1.getComparisonKey)("Charles Emil Sorensen");
            (0, vitest_1.expect)(key1).toBe(key2);
        });
        (0, vitest_1.it)("resolves aliases/variants to the same entity_id", () => {
            const e1 = entityResolver.resolve({ name: "Sorensen, Charles Emil", type: "PEOPLE", context: "Birth record" });
            const e2 = entityResolver.resolve({ name: "Charles Emil Sorensen", type: "PEOPLE", context: "Marriage record" });
            const e3 = entityResolver.resolve({ name: "Charles Sorensen", type: "PEOPLE", context: "Abbreviated" });
            (0, vitest_1.expect)(e1.id).toBe(e2.id);
            (0, vitest_1.expect)(e1.id).toBe(e3.id);
            (0, vitest_1.expect)(e1.name).toBe("Charles Emil Sorensen"); // Longest should be canonicalized
            (0, vitest_1.expect)(e1.context).toContain("Birth record");
            (0, vitest_1.expect)(e1.context).toContain("Marriage record");
        });
        (0, vitest_1.it)("distinguishes entities of different types", () => {
            const e1 = entityResolver.resolve({ name: "Copenhagen", type: "PLACES" });
            const e2 = entityResolver.resolve({ name: "Copenhagen", type: "ARTIFACTS" });
            (0, vitest_1.expect)(e1.id).not.toBe(e2.id);
        });
    });
    (0, vitest_1.describe)("LinkEngine", () => {
        (0, vitest_1.it)("infers same_entity links between documents", () => {
            const docA = {
                docId: "doc-A",
                rawText: "Charles Emil Sorensen was born in Denmark.",
                entities: [
                    { id: "ent-charles", name: "Charles Emil Sorensen", type: "PEOPLE", context: "", confidence: 0.95 }
                ],
                relationships: [],
                topics: [],
                summary: "",
                timestamp: new Date().toISOString()
            };
            const docB = {
                docId: "doc-B",
                rawText: "Charles Emil Sorensen worked at Ford.",
                entities: [
                    { id: "ent-charles", name: "Charles Emil Sorensen", type: "PEOPLE", context: "", confidence: 0.85 }
                ],
                relationships: [],
                topics: [],
                summary: "",
                timestamp: new Date().toISOString()
            };
            const links = linkEngine.computeLinks(docA, [docA, docB]);
            (0, vitest_1.expect)(links).toHaveLength(1);
            (0, vitest_1.expect)(links[0].type).toBe("same_entity");
            (0, vitest_1.expect)(links[0].sourceDocId).toBe("doc-A");
            (0, vitest_1.expect)(links[0].targetDocId).toBe("doc-B");
            (0, vitest_1.expect)(links[0].confidence).toBeGreaterThan(0.8);
            (0, vitest_1.expect)(links[0].confidence).toBeLessThanOrEqual(1.0);
        });
        (0, vitest_1.it)("infers related_topic links between documents", () => {
            const docA = {
                docId: "doc-A",
                rawText: "Content about family history.",
                entities: [],
                relationships: [],
                topics: [{ topic: "Early Life", weight: 0.9, category: "Biography" }],
                summary: "",
                timestamp: new Date().toISOString()
            };
            const docB = {
                docId: "doc-B",
                rawText: "Content about growing up.",
                entities: [],
                relationships: [],
                topics: [{ topic: "Early Life", weight: 0.8, category: "Biography" }],
                summary: "",
                timestamp: new Date().toISOString()
            };
            const links = linkEngine.computeLinks(docA, [docA, docB]);
            (0, vitest_1.expect)(links).toHaveLength(1);
            (0, vitest_1.expect)(links[0].type).toBe("related_topic");
            (0, vitest_1.expect)(links[0].sharedTopic).toBe("Early Life");
            (0, vitest_1.expect)(links[0].confidence).toBeCloseTo(Math.sqrt(0.9 * 0.8), 2);
        });
        (0, vitest_1.it)("infers co_occurs_with links when 2 or more entities are shared", () => {
            const docA = {
                docId: "doc-A",
                rawText: "Soren and Karen in Copenhagen.",
                entities: [
                    { id: "ent-soren", name: "Soren", type: "PEOPLE", context: "", confidence: 0.9 },
                    { id: "ent-karen", name: "Karen", type: "PEOPLE", context: "", confidence: 0.9 }
                ],
                relationships: [],
                topics: [],
                summary: "",
                timestamp: new Date().toISOString()
            };
            const docB = {
                docId: "doc-B",
                rawText: "Karen and Soren in Chicago.",
                entities: [
                    { id: "ent-soren", name: "Soren", type: "PEOPLE", context: "", confidence: 0.8 },
                    { id: "ent-karen", name: "Karen", type: "PEOPLE", context: "", confidence: 0.8 }
                ],
                relationships: [],
                topics: [],
                summary: "",
                timestamp: new Date().toISOString()
            };
            const links = linkEngine.computeLinks(docA, [docA, docB]);
            // Should find same_entity links for Soren and Karen, plus one co_occurs_with link
            const coOccur = links.filter(l => l.type === "co_occurs_with");
            (0, vitest_1.expect)(coOccur).toHaveLength(1);
            (0, vitest_1.expect)(coOccur[0].sourceDocId).toBe("doc-A");
            (0, vitest_1.expect)(coOccur[0].targetDocId).toBe("doc-B");
        });
    });
    (0, vitest_1.describe)("GraphBuilder", () => {
        (0, vitest_1.it)("maintains node/edge invariants and calculates neighborhoods", () => {
            const docA = {
                docId: "doc-A",
                rawText: "Charles Sorensen was born in Lellinge.",
                entities: [
                    { id: "ent-charles", name: "Charles Emil Sorensen", type: "PEOPLE", context: "", confidence: 0.95 },
                    { id: "ent-lellinge", name: "Lellinge", type: "PLACES", context: "", confidence: 0.98 }
                ],
                relationships: [
                    { subjectId: "ent-charles", objectId: "ent-lellinge", predicate: "born_in", details: "Born in Denmark parish", confidence: 0.98 }
                ],
                topics: ["Biography"],
                summary: "Doc A Summary",
                timestamp: new Date().toISOString()
            };
            const docB = {
                docId: "doc-B",
                rawText: "Charles Sorensen emigrated to America.",
                entities: [
                    { id: "ent-charles", name: "Charles Emil Sorensen", type: "PEOPLE", context: "", confidence: 0.9 }
                ],
                relationships: [],
                topics: ["Biography"],
                summary: "Doc B Summary",
                timestamp: new Date().toISOString()
            };
            // Compute links between docB and docA
            const links = linkEngine.computeLinks(docB, [docA, docB]);
            (0, vitest_1.expect)(links).toHaveLength(2); // same_entity, related_topic
            // Add to graph builder
            graphBuilder.addDocumentGraph(docA, []);
            graphBuilder.addDocumentGraph(docB, links);
            // Verify summary
            const summary = graphBuilder.getSummary();
            (0, vitest_1.expect)(summary.nodes.documents).toBe(2);
            (0, vitest_1.expect)(summary.nodes.entities).toBe(2); // Charles and Lellinge
            (0, vitest_1.expect)(summary.health.status).toBe("green");
            // Verify Entity neighborhood
            const charNeighborhood = graphBuilder.getEntityNeighborhood("ent-charles");
            (0, vitest_1.expect)(charNeighborhood.documents).toHaveLength(2);
            (0, vitest_1.expect)(charNeighborhood.relationships).toHaveLength(1);
            (0, vitest_1.expect)(charNeighborhood.relationships[0].predicate).toBe("born_in");
            (0, vitest_1.expect)(charNeighborhood.relationships[0].targetEntityId).toBe("ent-lellinge");
            // Verify Document neighborhood
            const docBNeighborhood = graphBuilder.getDocumentNeighborhood("doc-B");
            (0, vitest_1.expect)(docBNeighborhood.entities).toHaveLength(1);
            (0, vitest_1.expect)(docBNeighborhood.relatedDocuments).toHaveLength(2); // same_entity and related_topic
        });
    });
});
//# sourceMappingURL=linking-v2.contract.test.js.map