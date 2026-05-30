import { describe, it, expect } from "vitest";
import { SemanticExtractor } from "../../src/harvester/extractors/semanticExtractor";
import { RelationshipExtractor } from "../../src/harvester/extractors/relationshipExtractor";
import { TopicExtractor } from "../../src/harvester/extractors/topicExtractor";
import { ExtractorChain } from "../../src/harvester/extractors/extractor-chain";

describe("Extractor v2 Subsystems - Unit and Contract Tests", () => {
  const sampleSource = "Charles Emil Sorensen was born on September 7, 1881 in Lellinge, Sjælland, Denmark. He emigrated to Chicago in May 1883 with his father Soren Sorensen and mother Karen Sorensen.";

  it("should successfully extract semantic entities using SemanticExtractor", async () => {
    const extractor = new SemanticExtractor();
    const result = await extractor.extract({ raw: sampleSource });

    expect(result.type).toBe("semantic_extraction");
    expect(result.prompt).toBeDefined();
    expect(result.entities).toBeInstanceOf(Array);
    expect(result.entities.length).toBeGreaterThan(0);
    expect(result.entities[0]).toMatchObject({
      name: "Sorensen, Charles Emil",
      type: "PEOPLE"
    });
  });

  it("should successfully extract semantic relationships using RelationshipExtractor", async () => {
    const extractor = new RelationshipExtractor();
    const result = await extractor.extract({
      raw: sampleSource,
      entities: [
        { name: "Sorensen, Charles Emil", type: "PEOPLE" },
        { name: "Lellinge", type: "PLACES" }
      ]
    });

    expect(result.type).toBe("relationship_extraction");
    expect(result.prompt).toBeDefined();
    expect(result.relationships).toBeInstanceOf(Array);
    expect(result.relationships.length).toBeGreaterThan(0);
    expect(result.relationships[0]).toMatchObject({
      subject: "Sorensen, Charles Emil",
      object: "Lellinge",
      predicate: "born_in"
    });
  });

  it("should successfully extract themes and categories using TopicExtractor", async () => {
    const extractor = new TopicExtractor();
    const result = await extractor.extract({ raw: sampleSource });

    expect(result.type).toBe("topic_extraction");
    expect(result.prompt).toBeDefined();
    expect(result.topics).toContain("Early Life");
    expect(result.categories).toContain("Biography");
  });

  it("should successfully execute compositional chaining via ExtractorChain", async () => {
    const chain = new ExtractorChain();
    chain
      .add(new SemanticExtractor())
      .add(new RelationshipExtractor())
      .add(new TopicExtractor());

    const result = await chain.run(sampleSource);

    expect(result.chain_execution).toBe("completed");
    expect(result.results.length).toBe(3);
    expect(result.final_payload).toMatchObject({
      raw: sampleSource,
      type: "topic_extraction" // the last extractor output
    });
    expect(result.final_payload.entities).toBeDefined();
    expect(result.final_payload.relationships).toBeDefined();
    expect(result.final_payload.topics).toBeDefined();
  });
});
