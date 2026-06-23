"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const semanticExtractor_js_1 = require("../../src/harvester/extractors/semanticExtractor.js");
const relationshipExtractor_js_1 = require("../../src/harvester/extractors/relationshipExtractor.js");
const topicExtractor_js_1 = require("../../src/harvester/extractors/topicExtractor.js");
const extractor_chain_js_1 = require("../../src/harvester/extractors/extractor-chain.js");
const spec_registry_js_1 = require("../../src/cic/control-plane/spec-registry.js");
(0, vitest_1.describe)("Extractor v2 Subsystems - Unit and Contract Tests", () => {
    const sampleSource = "Charles Emil Sorensen was born on September 7, 1881 in Lellinge, Sjælland, Denmark. He emigrated to Chicago in May 1883 with his father Soren Sorensen and mother Karen Sorensen.";
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.spyOn(spec_registry_js_1.specRegistry, "evaluateInstincts").mockReturnValue({ prefer: [], avoid: [] });
        vitest_1.vi.spyOn(spec_registry_js_1.specRegistry, "getRules").mockReturnValue([]);
        vitest_1.vi.spyOn(spec_registry_js_1.specRegistry, "getHooks").mockReturnValue([]);
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.it)("should successfully extract semantic entities using SemanticExtractor", async () => {
        const extractor = new semanticExtractor_js_1.SemanticExtractor();
        const result = await extractor.extract({ raw: sampleSource });
        (0, vitest_1.expect)(result.type).toBe("semantic_extraction");
        (0, vitest_1.expect)(result.prompt).toBeDefined();
        (0, vitest_1.expect)(result.entities).toBeInstanceOf(Array);
        (0, vitest_1.expect)(result.entities.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.entities[0]).toMatchObject({
            name: "Sorensen, Charles Emil",
            type: "PEOPLE"
        });
    });
    (0, vitest_1.it)("should successfully extract semantic relationships using RelationshipExtractor", async () => {
        const extractor = new relationshipExtractor_js_1.RelationshipExtractor();
        const result = await extractor.extract({
            raw: sampleSource,
            entities: [
                { name: "Sorensen, Charles Emil", type: "PEOPLE" },
                { name: "Lellinge", type: "PLACES" }
            ]
        });
        (0, vitest_1.expect)(result.type).toBe("relationship_extraction");
        (0, vitest_1.expect)(result.prompt).toBeDefined();
        (0, vitest_1.expect)(result.relationships).toBeInstanceOf(Array);
        (0, vitest_1.expect)(result.relationships.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.relationships[0]).toMatchObject({
            subject: "Sorensen, Charles Emil",
            object: "Lellinge",
            predicate: "born_in"
        });
    });
    (0, vitest_1.it)("should successfully extract themes and categories using TopicExtractor", async () => {
        const extractor = new topicExtractor_js_1.TopicExtractor();
        const result = await extractor.extract({ raw: sampleSource });
        (0, vitest_1.expect)(result.type).toBe("topic_extraction");
        (0, vitest_1.expect)(result.prompt).toBeDefined();
        (0, vitest_1.expect)(result.topics).toContain("Early Life");
        (0, vitest_1.expect)(result.categories).toContain("Biography");
    });
    (0, vitest_1.it)("should successfully execute compositional chaining via ExtractorChain", async () => {
        const chain = new extractor_chain_js_1.ExtractorChain();
        chain
            .add(new semanticExtractor_js_1.SemanticExtractor())
            .add(new relationshipExtractor_js_1.RelationshipExtractor())
            .add(new topicExtractor_js_1.TopicExtractor());
        const result = await chain.run(sampleSource);
        (0, vitest_1.expect)(result.chain_execution).toBe("completed");
        (0, vitest_1.expect)(result.results.length).toBe(3);
        (0, vitest_1.expect)(result.final_payload).toMatchObject({
            raw: sampleSource,
            type: "topic_extraction" // the last extractor output
        });
        (0, vitest_1.expect)(result.final_payload.entities).toBeDefined();
        (0, vitest_1.expect)(result.final_payload.relationships).toBeDefined();
        (0, vitest_1.expect)(result.final_payload.topics).toBeDefined();
    });
});
//# sourceMappingURL=extractor-v2.test.js.map