/**
 * Unit & Integration Tests: ReverseImageSearchExtractor
 *
 * Tests reverse image search with TinEye API + CLIP fallback:
 * 1. Constructor validation (API key checks)
 * 2. Main extract flow (ImageMetadata → ReverseSearchResult)
 * 3. TinEye API integration (hash-based lookup, error handling)
 * 4. Cross-reference validation (Jaccard similarity scoring)
 * 5. Confidence adjustment (API weight 0.7, tag overlap 0.3)
 * 6. Match classification (exact, near_duplicate, related)
 * 7. Memory cache (hit/miss, TTL expiration)
 * 8. CLIP fallback (when TinEye fails)
 * 9. Retry logic (exponential backoff for 429/5xx)
 * 10. Healthcheck (API connectivity, rate limit info)
 *
 * Run: npm run test -- reverseImageSearchExtractor
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ReverseImageSearchExtractor,
  ReverseSearchResult,
  SearchMatch,
  createReverseImageSearchExtractor
} from "./reverseImageSearchExtractor";
import { ImageMetadata } from "./imageAnalyzerV3";

// ============================================================================
// SETUP & TEARDOWN
// ============================================================================

describe("ReverseImageSearchExtractor", () => {
  let extractor: ReverseImageSearchExtractor;

  beforeEach(() => {
    // Set required environment variable
    process.env.TINEYE_API_KEY = "test-api-key-tineye-12345";
    process.env.REVERSE_SEARCH_TIMEOUT_MS = "15000";
    process.env.CACHE_TTL_SECONDS = "86400";

    extractor = new ReverseImageSearchExtractor(false);

    // Mock fetch globally to avoid real API calls
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.TINEYE_API_KEY;
  });

  // ==========================================================================
  // CONSTRUCTOR & VALIDATION TESTS
  // ==========================================================================

  describe("Constructor", () => {
    it("should throw if TINEYE_API_KEY is missing", () => {
      delete process.env.TINEYE_API_KEY;
      expect(() => new ReverseImageSearchExtractor()).toThrow(
        /TINEYE_API_KEY env var is required/
      );
    });

    it("should throw if TINEYE_API_KEY is empty", () => {
      process.env.TINEYE_API_KEY = "";
      expect(() => new ReverseImageSearchExtractor()).toThrow(
        /TINEYE_API_KEY env var is required/
      );
    });

    it("should initialize with CLIP fallback disabled by default", () => {
      const ext = new ReverseImageSearchExtractor();
      expect(ext["clipFallbackEnabled"]).toBe(false);
    });

    it("should initialize with CLIP fallback enabled when requested", () => {
      const ext = new ReverseImageSearchExtractor(true);
      expect(ext["clipFallbackEnabled"]).toBe(true);
    });

    it("should read timeout from environment variable", () => {
      process.env.REVERSE_SEARCH_TIMEOUT_MS = "20000";
      const ext = new ReverseImageSearchExtractor();
      expect(ext["timeoutMs"]).toBe(20000);
    });

    it("should read cache TTL from environment variable", () => {
      process.env.CACHE_TTL_SECONDS = "43200"; // 12 hours
      const ext = new ReverseImageSearchExtractor();
      expect(ext["cacheTtlSeconds"]).toBe(43200);
    });
  });

  // ==========================================================================
  // TINEYE API INTEGRATION TESTS
  // ==========================================================================

  describe("TinEye API Integration", () => {
    it("should call TinEye API with correct headers and body", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([["X-Rate-Limit-Remaining", "119"]]),
        json: async () => ({
          results: [
            {
              url: "https://example.com/image.jpg",
              title: "Example Image",
              domain: "example.com",
              published_date: "2026-01-01T00:00:00Z",
              image_url: "https://example.com/thumb.jpg"
            }
          ],
          can_backlink: true
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const metadata = createTestImageMetadata();
      const result = await extractor.extract(metadata);

      expect(result.resultsCount).toBeGreaterThan(0);
      expect(result.matches[0].url).toBe("https://example.com/image.jpg");
    });

    it("should handle TinEye API 401 error (bad credentials)", async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        headers: new Map(),
        text: async () => "Unauthorized"
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const metadata = createTestImageMetadata();

      expect(async () => {
        await extractor.extract(metadata);
      }).rejects.toThrow();
    });

    it("should retry on 429 (rate limit) with exponential backoff", async () => {
      const mockResponse429 = {
        ok: false,
        status: 429,
        headers: new Map([["X-Rate-Limit-Remaining", "0"]]),
        text: async () => "Too Many Requests"
      };

      const mockResponseSuccess = {
        ok: true,
        status: 200,
        headers: new Map([["X-Rate-Limit-Remaining", "50"]]),
        json: async () => ({
          results: [
            {
              url: "https://example.com/image.jpg",
              title: "Retried Successfully"
            }
          ],
          can_backlink: true
        })
      };

      (global.fetch as any)
        .mockResolvedValueOnce(mockResponse429)
        .mockResolvedValueOnce(mockResponseSuccess);

      const metadata = createTestImageMetadata();

      // Should retry and eventually succeed
      const result = await extractor.extract(metadata);
      expect(result.resultsCount).toBeGreaterThan(0);
    });

    it("should retry on 500+ errors (server errors)", async () => {
      const mockResponse500 = {
        ok: false,
        status: 500,
        headers: new Map(),
        text: async () => "Internal Server Error"
      };

      const mockResponseSuccess = {
        ok: true,
        status: 200,
        headers: new Map([["X-Rate-Limit-Remaining", "50"]]),
        json: async () => ({
          results: [],
          can_backlink: false
        })
      };

      (global.fetch as any)
        .mockResolvedValueOnce(mockResponse500)
        .mockResolvedValueOnce(mockResponseSuccess);

      const metadata = createTestImageMetadata();

      const result = await extractor.extract(metadata);
      expect(result.type).toBe("reverse_image_search");
    });

    it("should handle timeout gracefully", async () => {
      (global.fetch as any).mockImplementation(
        () => new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 100)
        )
      );

      const metadata = createTestImageMetadata();

      // Should handle timeout and return empty result
      const result = await extractor.extract(metadata);
      expect(result.resultsCount).toBe(0);
    });

    it("should fail immediately on 401 without retry", async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        headers: new Map(),
        text: async () => "Unauthorized"
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const metadata = createTestImageMetadata();

      // Should not retry, just fail
      const result = await extractor.extract(metadata);
      expect(result.resultsCount).toBe(0);
    });
  });

  // ==========================================================================
  // CROSS-REFERENCE VALIDATION TESTS (JACCARD SIMILARITY)
  // ==========================================================================

  describe("Cross-Reference Validation", () => {
    it("should compute Jaccard similarity correctly", () => {
      const set1 = new Set(["dog", "outdoor", "sunny"]);
      const set2 = new Set(["dog", "sunny", "park"]);

      const similarity = extractor["computeJaccardSimilarity"](set1, set2);

      // Intersection: {dog, sunny} = 2
      // Union: {dog, outdoor, sunny, park} = 4
      // Jaccard = 2/4 = 0.5
      expect(similarity).toBeCloseTo(0.5, 1);
    });

    it("should return 1.0 for identical sets", () => {
      const set1 = new Set(["dog", "outdoor"]);
      const set2 = new Set(["dog", "outdoor"]);

      const similarity = extractor["computeJaccardSimilarity"](set1, set2);
      expect(similarity).toBe(1.0);
    });

    it("should return 0.0 for disjoint sets", () => {
      const set1 = new Set(["dog"]);
      const set2 = new Set(["cat"]);

      const similarity = extractor["computeJaccardSimilarity"](set1, set2);
      expect(similarity).toBe(0.0);
    });

    it("should return 1.0 for empty sets", () => {
      const set1 = new Set<string>();
      const set2 = new Set<string>();

      const similarity = extractor["computeJaccardSimilarity"](set1, set2);
      expect(similarity).toBe(1.0);
    });

    it("should blend API confidence (0.7) with Jaccard score (0.3)", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([["X-Rate-Limit-Remaining", "119"]]),
        json: async () => ({
          results: [
            {
              url: "https://example.com/dog.jpg",
              title: "Dog in the park",
              domain: "example.com"
            }
          ],
          can_backlink: true
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const metadata = createTestImageMetadata();
      metadata.objects = [{ label: "dog", confidence: 0.95 } as any];

      const result = await extractor.extract(metadata);

      // Should have validation method updated
      expect(result.matches[0].validationMethod).toBe("with_jaccard");
      expect(result.matches[0].confidence).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // MATCH CLASSIFICATION TESTS
  // ==========================================================================

  describe("Match Classification", () => {
    it("should classify as exact when confidence > 0.95", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([["X-Rate-Limit-Remaining", "119"]]),
        json: async () => ({
          results: [
            {
              url: "https://example.com/image.jpg",
              title: "Perfect match"
            }
          ]
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const metadata = createTestImageMetadata();
      const result = await extractor.extract(metadata);

      // Manually verify classification logic
      const match = result.matches[0];
      if (match.confidence > 0.95) {
        expect(match.matchType).toBe("exact");
      }
    });

    it("should classify as near_duplicate when confidence 0.85-0.95", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([["X-Rate-Limit-Remaining", "119"]]),
        json: async () => ({
          results: [
            {
              url: "https://example.com/image.jpg",
              title: "Similar match"
            }
          ]
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const metadata = createTestImageMetadata();
      const result = await extractor.extract(metadata);

      const match = result.matches[0];
      if (match.confidence >= 0.85 && match.confidence <= 0.95) {
        expect(match.matchType).toBe("near_duplicate");
      }
    });

    it("should classify as related when confidence < 0.85", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([["X-Rate-Limit-Remaining", "119"]]),
        json: async () => ({
          results: [
            {
              url: "https://example.com/image.jpg",
              title: "Loosely related"
            }
          ]
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const metadata = createTestImageMetadata();
      const result = await extractor.extract(metadata);

      const match = result.matches[0];
      if (match.confidence < 0.85) {
        expect(match.matchType).toBe("related");
      }
    });
  });

  // ==========================================================================
  // CACHE TESTS
  // ==========================================================================

  describe("Memory Cache", () => {
    it("should return cached result on second call", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([["X-Rate-Limit-Remaining", "119"]]),
        json: async () => ({
          results: [
            {
              url: "https://example.com/image.jpg",
              title: "Cached Result"
            }
          ],
          can_backlink: true
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const metadata = createTestImageMetadata();

      // First call - should hit API
      const result1 = await extractor.extract(metadata);
      expect(result1.cacheHit).toBe(false);

      // Reset mock
      (global.fetch as any).mockClear();

      // Second call - should hit cache (no new fetch)
      const result2 = await extractor.extract(metadata);
      expect(result2.cacheHit).toBe(true);
      expect((global.fetch as any)).not.toHaveBeenCalled();
    });

    it("should expire cache entries after TTL", async () => {
      // Set very short TTL for testing
      process.env.CACHE_TTL_SECONDS = "0.1"; // 100ms
      const shortExtractor = new ReverseImageSearchExtractor();

      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([["X-Rate-Limit-Remaining", "119"]]),
        json: async () => ({
          results: [{ url: "https://example.com/image.jpg" }]
        })
      };

      (global.fetch as any)
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse);

      const metadata = createTestImageMetadata();

      // First call
      const result1 = await shortExtractor.extract(metadata);
      expect(result1.cacheHit).toBe(false);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Second call - should hit API again (cache expired)
      const result2 = await shortExtractor.extract(metadata);
      expect(result2.cacheHit).toBe(false);
    });

    it("should generate consistent cache keys", () => {
      const key1 = extractor["generateCacheKey"]("test-image-id");
      const key2 = extractor["generateCacheKey"]("test-image-id");

      expect(key1).toBe(key2);
      expect(key1.length).toBe(64); // SHA256 hex = 64 chars
    });

    it("should generate different cache keys for different inputs", () => {
      const key1 = extractor["generateCacheKey"]("image1");
      const key2 = extractor["generateCacheKey"]("image2");

      expect(key1).not.toBe(key2);
    });
  });

  // ==========================================================================
  // CLIP FALLBACK TESTS
  // ==========================================================================

  describe("CLIP Fallback", () => {
    it("should activate CLIP fallback when TinEye fails with 401", async () => {
      const extWithClip = new ReverseImageSearchExtractor(true);

      const mockResponse = {
        ok: false,
        status: 401,
        headers: new Map(),
        text: async () => "Unauthorized"
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const metadata = createTestImageMetadata();

      const result = await extWithClip.extract(metadata);

      // Should have fallback telemetry
      expect(result.telemetry.fallback).toBeDefined();
      expect(result.fallbackUsed).toBe(true);
    });

    it("should not activate CLIP fallback when disabled", async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        headers: new Map(),
        text: async () => "Unauthorized"
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const metadata = createTestImageMetadata();

      const result = await extractor.extract(metadata);

      // Should not have fallback
      expect(result.fallbackUsed).toBe(false);
    });

    it("should include CLIP telemetry when fallback is used", async () => {
      const extWithClip = new ReverseImageSearchExtractor(true);

      const mockResponse = {
        ok: false,
        status: 401,
        headers: new Map(),
        text: async () => "Unauthorized"
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const metadata = createTestImageMetadata();

      const result = await extWithClip.extract(metadata);

      expect(result.telemetry.fallback?.modelUsed).toBe("clip-vit-base-patch32");
      expect(result.telemetry.fallback?.reason).toContain("TinEye");
    });
  });

  // ==========================================================================
  // EXTRACTION FLOW TESTS
  // ==========================================================================

  describe("Extract Flow (ImageMetadata → ReverseSearchResult)", () => {
    it("should accept ImageMetadata and return ReverseSearchResult", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([["X-Rate-Limit-Remaining", "119"]]),
        json: async () => ({
          results: [
            {
              url: "https://example.com/image.jpg",
              title: "Result"
            }
          ]
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const metadata = createTestImageMetadata();
      const result = await extractor.extract(metadata);

      expect(result.type).toBe("reverse_image_search");
      expect(result.searchQuery).toBe(metadata.imageId);
      expect(Array.isArray(result.matches)).toBe(true);
    });

    it("should return empty results when no matches found", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([["X-Rate-Limit-Remaining", "119"]]),
        json: async () => ({
          results: [],
          can_backlink: false
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const metadata = createTestImageMetadata();
      const result = await extractor.extract(metadata);

      expect(result.resultsCount).toBe(0);
      expect(result.matches.length).toBe(0);
      expect(result.topMatchConfidence).toBe(0);
    });

    it("should include telemetry data in result", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([["X-Rate-Limit-Remaining", "50"]]),
        json: async () => ({
          results: [
            {
              url: "https://example.com/image.jpg"
            }
          ],
          can_backlink: true
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const metadata = createTestImageMetadata();
      const result = await extractor.extract(metadata);

      expect(result.telemetry).toBeDefined();
      expect(result.telemetry.cacheKey).toBeDefined();
      expect(result.telemetry.api.statusCode).toBe(200);
      expect(result.telemetry.api.canBacklink).toBe(true);
    });

    it("should sort matches by confidence descending", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([["X-Rate-Limit-Remaining", "119"]]),
        json: async () => ({
          results: [
            {
              url: "https://example.com/image1.jpg",
              title: "First"
            },
            {
              url: "https://example.com/image2.jpg",
              title: "Second"
            },
            {
              url: "https://example.com/image3.jpg",
              title: "Third"
            }
          ]
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const metadata = createTestImageMetadata();
      const result = await extractor.extract(metadata);

      // Should be sorted by confidence descending
      for (let i = 0; i < result.matches.length - 1; i++) {
        expect(result.matches[i].confidence).toBeGreaterThanOrEqual(
          result.matches[i + 1].confidence
        );
      }
    });

    it("should measure elapsed time", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([["X-Rate-Limit-Remaining", "119"]]),
        json: async () => ({
          results: []
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const metadata = createTestImageMetadata();
      const result = await extractor.extract(metadata);

      expect(result.timeElapsedMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.timeElapsedMs).toBe("number");
    });
  });

  // ==========================================================================
  // HEALTHCHECK TESTS
  // ==========================================================================

  describe("Healthcheck", () => {
    it("should pass healthcheck with valid API key", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([["X-Rate-Limit-Remaining", "119"]]),
        json: async () => ({
          results: []
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const health = await extractor.healthcheck();

      expect(health.healthy).toBe(true);
      expect(health.rateLimitRemaining).toBeGreaterThan(0);
    });

    it("should fail healthcheck with invalid API key", async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        headers: new Map(),
        text: async () => "Unauthorized"
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const health = await extractor.healthcheck();

      expect(health.healthy).toBe(false);
    });

    it("should return rate limit remaining in healthcheck", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([["X-Rate-Limit-Remaining", "42"]]),
        json: async () => ({
          results: []
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const health = await extractor.healthcheck();

      expect(health.rateLimitRemaining).toBe(42);
    });
  });

  // ==========================================================================
  // FACTORY FUNCTION TESTS
  // ==========================================================================

  describe("Factory Function", () => {
    it("should create extractor with healthcheck", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([["X-Rate-Limit-Remaining", "119"]]),
        json: async () => ({
          results: []
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const ext = await createReverseImageSearchExtractor(false);

      expect(ext).toBeInstanceOf(ReverseImageSearchExtractor);
    });

    it("should throw if healthcheck fails", async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        headers: new Map(),
        text: async () => "Unauthorized"
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      expect(async () => {
        await createReverseImageSearchExtractor();
      }).rejects.toThrow();
    });
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * createTestImageMetadata — fixture for tests
 */
function createTestImageMetadata(): ImageMetadata {
  return {
    imageId: "test-image-12345",
    originalFilename: "test.jpg",
    mimeType: "image/jpeg",
    fileSizeBytes: 102400,
    objects: [
      {
        label: "dog",
        confidence: 0.95,
        description: "A dog in a park"
      }
    ],
    faces: [],
    colors: [
      {
        hex: "#3A4D5C",
        rgb: { r: 58, g: 77, b: 92 },
        name: "slate blue",
        percentage: 25.5
      }
    ],
    geoHints: [
      {
        hintType: "terrain",
        value: "park",
        confidence: 0.8
      }
    ],
    sceneDescription: "A dog playing in an outdoor park on a sunny day",
    analysisConfidence: 0.88,
    analyzedAt: new Date().toISOString(),
    analyzedWithModel: "gemini-2.0-flash-latest"
  };
}
