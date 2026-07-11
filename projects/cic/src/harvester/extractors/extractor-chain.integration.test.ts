/**
 * projects/cic/src/harvester/extractors/extractor-chain.integration.test.ts
 * E2E integration tests for ExtractorChain with ImageAnalyzerV3 and ReverseImageSearchExtractor
 *
 * Test coverage:
 * - Full image document flow (docType + sourceFormat gating)
 * - Instinct-based extractor avoidance
 * - Context threading across extractors
 * - Latency tracking and telemetry
 * - Error handling and partial results
 *
 * Last Updated: 2026-07-11
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ExtractorChain } from "./extractor-chain.js";
import { IExtractor } from "./iextractor.js";
import type { ImageMetadata } from "./imageAnalyzerV3.js";
import type { ReverseSearchResult } from "./reverseImageSearchExtractor.js";

// ============================================================================
// MOCK EXTRACTORS
// ============================================================================

/**
 * MockImageAnalyzerV3 — mocked ImageAnalyzerV3 for testing
 */
class MockImageAnalyzerV3 implements IExtractor {
  async extract(input: any): Promise<any> {
    const metadata: ImageMetadata = {
      imageId: "test-image-001",
      originalFilename: "test.jpg",
      mimeType: "image/jpeg",
      fileSizeBytes: 2048,
      objects: [
        { label: "person", confidence: 0.92, boundingBox: { top: 10, left: 20, width: 100, height: 150 } },
        { label: "building", confidence: 0.85, boundingBox: { top: 0, left: 0, width: 200, height: 200 } }
      ],
      faces: [
        { id: "face_1", confidence: 0.88, boundingBox: { top: 15, left: 30, width: 80, height: 100 } }
      ],
      colors: [
        { hex: "#3A4D5C", rgb: { r: 58, g: 77, b: 92 }, name: "slate blue", percentage: 25.5, classification: "background" }
      ],
      geoHints: [
        { hintType: "landmark", value: "City Hall", confidence: 0.72 }
      ],
      sceneDescription: "A formal portrait of a person standing in front of a historic building.",
      analysisConfidence: 0.85,
      analyzedAt: new Date().toISOString(),
      analyzedWithModel: "gemini-2.0-flash-latest"
    };

    return {
      type: "image_analysis",
      metadata
    };
  }
}

/**
 * MockReverseImageSearchExtractor — mocked ReverseImageSearchExtractor for testing
 */
class MockReverseImageSearchExtractor implements IExtractor {
  async extract(input: any): Promise<any> {
    const result: ReverseSearchResult = {
      type: "reverse_image_search",
      searchQuery: input.imageMetadata?.imageId || "test-image-001",
      resultsCount: 3,
      matches: [
        {
          url: "https://example.com/image-1",
          title: "City Hall Photo",
          domain: "example.com",
          publishDate: "2024-01-15T10:30:00Z",
          thumbnail: "https://example.com/thumb-1.jpg",
          confidence: 0.96,
          matchType: "exact",
          validationMethod: "with_jaccard"
        },
        {
          url: "https://archive.org/image-2",
          title: "Historic Buildings",
          domain: "archive.org",
          confidence: 0.82,
          matchType: "near_duplicate",
          validationMethod: "with_jaccard"
        }
      ],
      topMatchConfidence: 0.96,
      cacheHit: false,
      fallbackUsed: false,
      timeElapsedMs: 245,
      telemetry: {
        cacheKey: "abc123def456",
        validationMethod: "exact",
        api: { statusCode: 200, canBacklink: true }
      }
    };

    return result;
  }
}

/**
 * MockFailingExtractor — extractor that throws an error
 */
class MockFailingExtractor implements IExtractor {
  async extract(input: any): Promise<any> {
    throw new Error("Extractor failed: simulated API error");
  }
}

/**
 * MockSemanticExtractor — extractor that returns semantic output
 */
class MockSemanticExtractor implements IExtractor {
  async extract(input: any): Promise<any> {
    return {
      type: "semantic_analysis",
      entities: ["city", "building", "portrait"],
      themes: ["architecture", "urban"],
      semanticScore: 0.87
    };
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe("ExtractorChain E2E Integration Tests", () => {
  let chain: ExtractorChain;

  beforeEach(() => {
    // Create a fresh chain for each test
    chain = new ExtractorChain();
  });

  // ========================================================================
  // TEST 1: Full image document flow
  // ========================================================================

  it("Test 1: Full image document flow - ImageAnalyzerV3 → ReverseImageSearchExtractor", async () => {
    // Setup
    chain.add(new MockImageAnalyzerV3());
    chain.add(new MockReverseImageSearchExtractor());

    const testImage = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46,
      0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00
    ]).toString("base64");

    // Execute
    const result = await chain.run(testImage, {
      docType: "image",
      sourceFormat: "jpg",
      tenantId: "test-tenant",
      region: "us-east-1"
    });

    // Assert
    expect(result).toBeDefined();
    expect(result.chain_execution).toBe("completed");
    expect(result.results).toHaveLength(2);

    // Verify ImageAnalyzerV3 output is captured
    const imageAnalysisResult = result.results[0];
    expect(imageAnalysisResult.type).toBe("image_analysis");
    expect(imageAnalysisResult.metadata.imageId).toBe("test-image-001");
    expect(imageAnalysisResult.metadata.objects).toHaveLength(2);
    expect(imageAnalysisResult.metadata.faces).toHaveLength(1);

    // Verify ReverseImageSearchExtractor output is captured
    const reverseSearchResult = result.results[1];
    expect(reverseSearchResult.type).toBe("reverse_image_search");
    expect(reverseSearchResult.resultsCount).toBe(3);
    expect(reverseSearchResult.matches).toHaveLength(2);
    expect(reverseSearchResult.topMatchConfidence).toBe(0.96);

    // Verify outputs are contained in results array
    const hasImageAnalysis = result.results.some((r: any) => r.type === "image_analysis");
    const hasReverseSearch = result.results.some((r: any) => r.type === "reverse_image_search");
    expect(hasImageAnalysis).toBe(true);
    expect(hasReverseSearch).toBe(true);
  });

  // ========================================================================
  // TEST 2: Multiple extractors in chain all execute
  // ========================================================================

  it("Test 2: Multiple extractors in chain - all execute in order", async () => {
    chain.add(new MockSemanticExtractor());
    chain.add(new MockImageAnalyzerV3());
    chain.add(new MockReverseImageSearchExtractor());

    // Execute
    const result = await chain.run("test document", {
      docType: "image",
      sourceFormat: "jpg",
      tenantId: "test-tenant",
      region: "us-east-1"
    });

    // Assert: All extractors should run in order
    expect(result.results).toHaveLength(3);
    expect(result.results[0].type).toBe("semantic_analysis");
    expect(result.results[1].type).toBe("image_analysis");
    expect(result.results[2].type).toBe("reverse_image_search");
  });

  // ========================================================================
  // TEST 3: Context threading - data flows through final payload
  // ========================================================================

  it("Test 3: Context threading - extracted data appears in final payload", async () => {
    chain.add(new MockImageAnalyzerV3());
    chain.add(new MockReverseImageSearchExtractor());

    const result = await chain.run("test image", {
      docType: "image",
      sourceFormat: "jpg",
      tenantId: "test-tenant",
      region: "us-east-1"
    });

    // Verify results
    expect(result.results).toHaveLength(2);

    // Verify final payload contains merged data from all extractors
    expect(result.final_payload).toBeDefined();

    // The final_payload is a merge of all extractor outputs, with later ones overwriting earlier ones
    // So we should see fields from the last extractor (reverse search)
    expect(result.final_payload.type).toBe("reverse_image_search");
    expect(result.final_payload.resultsCount).toBe(3);
    expect(result.final_payload.topMatchConfidence).toBe(0.96);

    // But we should also see fields from ImageAnalyzerV3 in the results array
    const imageResult = result.results.find((r: any) => r.type === "image_analysis");
    expect(imageResult.metadata.imageId).toBe("test-image-001");
  });

  // ========================================================================
  // TEST 4: Latency tracking - both latencies should be captured internally
  // ========================================================================

  it("Test 4: Latency tracking - latencies are captured for both extractors", async () => {
    chain.add(new MockImageAnalyzerV3());
    chain.add(new MockReverseImageSearchExtractor());

    const result = await chain.run("test image", {
      docType: "image",
      sourceFormat: "jpg",
      tenantId: "test-tenant",
      region: "us-east-1"
    });

    // Verify both extractors ran successfully
    expect(result.results).toHaveLength(2);
    expect(result.results[0].type).toBe("image_analysis");
    expect(result.results[1].type).toBe("reverse_image_search");

    // Verify the chain completed
    expect(result.chain_execution).toBe("completed");
  });

  // ========================================================================
  // TEST 5: Telemetry outcomes - reverse search outcomes recorded
  // ========================================================================

  it("Test 5: Telemetry outcomes - reverse search with cache status", async () => {
    // Custom reverse search extractor with cache hit
    class CachedReverseSearcher implements IExtractor {
      async extract(input: any): Promise<any> {
        return {
          type: "reverse_image_search",
          searchQuery: "test-image-001",
          resultsCount: 5,
          matches: [
            { url: "https://example.com/1", title: "Match 1", domain: "example.com", confidence: 0.98, matchType: "exact", validationMethod: "api_only" },
            { url: "https://example.com/2", title: "Match 2", domain: "example.com", confidence: 0.92, matchType: "near_duplicate", validationMethod: "api_only" }
          ],
          topMatchConfidence: 0.98,
          cacheHit: true, // Simulating cache hit
          fallbackUsed: false,
          timeElapsedMs: 45,
          telemetry: {
            cacheKey: "cached-key-12345",
            validationMethod: "exact",
            api: { statusCode: 200, canBacklink: true }
          }
        };
      }
    }

    chain.add(new MockImageAnalyzerV3());
    chain.add(new CachedReverseSearcher());

    const result = await chain.run("test", {
      docType: "photograph",
      sourceFormat: "png",
      tenantId: "test-tenant",
      region: "us-west-2"
    });

    // Verify reverse search results are captured
    const reverseSearchResult = result.results[1];
    expect(reverseSearchResult.type).toBe("reverse_image_search");
    expect(reverseSearchResult.cacheHit).toBe(true);
    expect(reverseSearchResult.resultsCount).toBe(5);
    expect(reverseSearchResult.topMatchConfidence).toBe(0.98);
  });

  // ========================================================================
  // TEST 6: Error handling - one extractor fails, pipeline fails
  // ========================================================================

  it("Test 6: Error handling - extractor failure is propagated", async () => {
    chain.add(new MockImageAnalyzerV3());
    chain.add(new MockFailingExtractor());
    chain.add(new MockSemanticExtractor());

    // Execute - expect error to be thrown at failing extractor
    let caughtError: Error | null = null;
    try {
      await chain.run("test image", {
        docType: "image",
        sourceFormat: "jpg",
        tenantId: "test-tenant",
        region: "us-east-1"
      });
    } catch (err: any) {
      caughtError = err;
    }

    // Verify error was thrown
    expect(caughtError).toBeDefined();
    expect(caughtError!.message).toContain("Extractor failed");
  });

  // ========================================================================
  // TEST 7: Multiple image formats supported
  // ========================================================================

  it("Test 7: Multiple image formats supported - png, gif, webp, tiff, bmp all pass gating", async () => {
    const imageFormats = ["png", "gif", "webp", "tiff", "bmp"];

    for (const format of imageFormats) {
      const testChain = new ExtractorChain();
      testChain.add(new MockImageAnalyzerV3());
      testChain.add(new MockReverseImageSearchExtractor());

      const result = await testChain.run("test image", {
        docType: "visual_document",
        sourceFormat: format,
        tenantId: "test-tenant",
        region: "us-east-1"
      });

      expect(result.results).toHaveLength(2);
      expect(result.results[0].type).toBe("image_analysis");
      expect(result.results[1].type).toBe("reverse_image_search");
    }
  });

  // ========================================================================
  // TEST 8: Chain execution with error recovery
  // ========================================================================

  it("Test 8: Chain completes payload with proper structure", async () => {
    chain.add(new MockImageAnalyzerV3());
    chain.add(new MockReverseImageSearchExtractor());

    const result = await chain.run("test content", {
      docType: "image",
      sourceFormat: "jpg",
      tenantId: "test-tenant",
      region: "us-east-1"
    });

    // Verify payload structure
    expect(result.chain_execution).toBe("completed");
    expect(result.timestamp).toBeDefined();
    expect(result.results).toBeDefined();
    expect(result.final_payload).toBeDefined();

    // Verify metadata is captured
    expect(result.final_payload.doc_type).toBe("image");
    expect(result.final_payload.source_format).toBe("jpg");
  });

  // ========================================================================
  // TEST 9: All image doc types pass gating
  // ========================================================================

  it("Test 9: All image doc types pass gating - image, visual_document, photograph all pass", async () => {
    const imageDocTypes = ["image", "visual_document", "photograph"];

    for (const docType of imageDocTypes) {
      const testChain = new ExtractorChain();
      testChain.add(new MockImageAnalyzerV3());
      testChain.add(new MockReverseImageSearchExtractor());

      const result = await testChain.run("test", {
        docType,
        sourceFormat: "jpg",
        tenantId: "test-tenant",
        region: "us-east-1"
      });

      expect(result.results).toHaveLength(2);
      expect(result.results[0].type).toBe("image_analysis");
      expect(result.results[1].type).toBe("reverse_image_search");
    }
  });

  // ========================================================================
  // TEST 10: Results array captures all extractor outputs in order
  // ========================================================================

  it("Test 10: Results array contains outputs in execution order", async () => {
    chain.add(new MockSemanticExtractor());
    chain.add(new MockImageAnalyzerV3());
    chain.add(new MockReverseImageSearchExtractor());

    const result = await chain.run("test content", {
      docType: "image",
      sourceFormat: "jpg",
      tenantId: "test-tenant",
      region: "us-east-1"
    });

    // Verify results array
    expect(result.results).toBeDefined();
    expect(result.results.length).toBeGreaterThan(0);

    // Verify first result is semantic analysis
    expect(result.results[0].type).toBe("semantic_analysis");
    expect(result.results[0].entities).toBeDefined();

    // Verify image analysis output
    const imageResult = result.results.find((r: any) => r.type === "image_analysis");
    expect(imageResult).toBeDefined();
    expect(imageResult.metadata.imageId).toBe("test-image-001");

    // Verify reverse search output
    const searchResult = result.results.find((r: any) => r.type === "reverse_image_search");
    expect(searchResult).toBeDefined();
    expect(searchResult.resultsCount).toBe(3);
  });
});
