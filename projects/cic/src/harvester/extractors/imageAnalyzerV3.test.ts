/**
 * Unit & Integration Tests: ImageAnalyzerV3
 *
 * Tests vision extraction using Gemini Flash Latest:
 * 1. Constructor validation (API key checks)
 * 2. Image validation (MIME type, size, integrity)
 * 3. Feature extraction (objects, faces, colors, geo)
 * 4. Scene description
 * 5. Healthcheck (API connectivity)
 * 6. Retry logic (exponential backoff)
 * 7. Timeout handling
 * 8. Error handling & graceful degradation
 * 9. Confidence computation
 * 10. Aggregate metadata assembly
 *
 * Run: npm run test -- imageAnalyzerV3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ImageAnalyzerV3,
  ImageMetadata,
  DetectedObject,
  DetectedFace,
  DominantColor,
  GeoHint,
  ImageAnalyzerInput,
  ImageAnalysisResult
} from "./imageAnalyzerV3";

describe("ImageAnalyzerV3", () => {
  let analyzer: ImageAnalyzerV3;
  let testImageBuffer: Buffer;

  beforeEach(() => {
    // Set environment variables
    process.env.GOOGLE_AI_API_KEY = "test-api-key-12345";
    process.env.IMAGE_ANALYSIS_TIMEOUT_MS = "10000";
    process.env.IMAGE_ANALYSIS_CONFIDENCE_THRESHOLD = "0.6";
    process.env.IMAGE_MAX_SIZE_MB = "25";

    // Create a minimal valid JPEG buffer header
    testImageBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46,
      0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00
    ]);

    analyzer = new ImageAnalyzerV3();
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.GOOGLE_AI_API_KEY;
  });

  // ==========================================================================
  // CONSTRUCTOR & VALIDATION TESTS
  // ==========================================================================

  describe("Constructor", () => {
    it("should throw if GOOGLE_AI_API_KEY is missing", () => {
      delete process.env.GOOGLE_AI_API_KEY;
      expect(() => new ImageAnalyzerV3()).toThrow(
        /GOOGLE_AI_API_KEY env var is required/
      );
    });

    it("should throw if GOOGLE_AI_API_KEY is empty", () => {
      process.env.GOOGLE_AI_API_KEY = "";
      expect(() => new ImageAnalyzerV3()).toThrow(
        /GOOGLE_AI_API_KEY env var is required/
      );
    });

    it("should initialize with default timeout when not specified", () => {
      delete process.env.IMAGE_ANALYSIS_TIMEOUT_MS;
      analyzer = new ImageAnalyzerV3();
      expect(analyzer["timeoutMs"]).toBe(10000);
    });

    it("should initialize with default confidence threshold", () => {
      delete process.env.IMAGE_ANALYSIS_CONFIDENCE_THRESHOLD;
      analyzer = new ImageAnalyzerV3();
      expect(analyzer["confidenceThreshold"]).toBe(0.6);
    });

    it("should read configuration from environment variables", () => {
      process.env.IMAGE_ANALYSIS_TIMEOUT_MS = "15000";
      process.env.IMAGE_ANALYSIS_CONFIDENCE_THRESHOLD = "0.75";
      analyzer = new ImageAnalyzerV3();

      expect(analyzer["timeoutMs"]).toBe(15000);
      expect(analyzer["confidenceThreshold"]).toBe(0.75);
    });
  });

  // ==========================================================================
  // IMAGE VALIDATION TESTS
  // ==========================================================================

  describe("Image Validation", () => {
    it("should accept JPEG images", async () => {
      const input: ImageAnalyzerInput = {
        imageId: "test-1",
        imageData: testImageBuffer,
        mimeType: "image/jpeg",
        fileSizeBytes: testImageBuffer.length
      };

      const result = await analyzer["validateImage"](input);
      expect(result).toBe(true);
    });

    it("should accept PNG images", async () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
      ]);

      const input: ImageAnalyzerInput = {
        imageId: "test-2",
        imageData: pngBuffer,
        mimeType: "image/png",
        fileSizeBytes: pngBuffer.length
      };

      const result = await analyzer["validateImage"](input);
      expect(result).toBe(true);
    });

    it("should reject unsupported MIME types", async () => {
      const input: ImageAnalyzerInput = {
        imageId: "test-3",
        imageData: testImageBuffer,
        mimeType: "image/tiff", // Unsupported
        fileSizeBytes: testImageBuffer.length
      };

      const result = await analyzer["validateImage"](input);
      expect(result).toBe(false);
    });

    it("should reject empty images", async () => {
      const input: ImageAnalyzerInput = {
        imageId: "test-4",
        imageData: Buffer.from([]),
        mimeType: "image/jpeg",
        fileSizeBytes: 0
      };

      const result = await analyzer["validateImage"](input);
      expect(result).toBe(false);
    });

    it("should reject oversized images", async () => {
      const largeMb = 30;
      const input: ImageAnalyzerInput = {
        imageId: "test-5",
        imageData: testImageBuffer,
        mimeType: "image/jpeg",
        fileSizeBytes: largeMb * 1024 * 1024
      };

      const result = await analyzer["validateImage"](input);
      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // FEATURE EXTRACTION TESTS (MOCKED)
  // ==========================================================================

  describe("Feature Extraction", () => {
    it("should extract objects with proper structure", async () => {
      vi.spyOn(analyzer as any, "callGeminiVision").mockResolvedValueOnce({
        success: true,
        data: [
          {
            label: "person",
            confidence: 0.95,
            boundingBox: { top: 10, left: 20, width: 50, height: 60 },
            description: "standing figure"
          },
          {
            label: "background",
            confidence: 0.88,
            boundingBox: { top: 0, left: 0, width: 100, height: 100 },
            description: "indoor setting"
          }
        ]
      });

      const input: ImageAnalyzerInput = {
        imageId: "test-obj-1",
        imageData: testImageBuffer,
        mimeType: "image/jpeg",
        fileSizeBytes: testImageBuffer.length
      };

      const objects = await analyzer.extractObjects(input);

      expect(objects).toHaveLength(2);
      expect(objects[0]).toMatchObject({
        label: "person",
        confidence: 0.95,
        boundingBox: { top: 10, left: 20, width: 50, height: 60 }
      });
    });

    it("should extract faces with attributes", async () => {
      vi.spyOn(analyzer as any, "callGeminiVision").mockResolvedValueOnce({
        success: true,
        data: [
          {
            id: "face_1",
            confidence: 0.92,
            boundingBox: { top: 30, left: 40, width: 60, height: 80 },
            attributes: {
              approximate_age_range: "25-35",
              gender: "male",
              expression: "neutral",
              visibility: "clear"
            },
            description: "formal portrait"
          }
        ]
      });

      const input: ImageAnalyzerInput = {
        imageId: "test-face-1",
        imageData: testImageBuffer,
        mimeType: "image/jpeg",
        fileSizeBytes: testImageBuffer.length
      };

      const faces = await analyzer.extractFaces(input);

      expect(faces).toHaveLength(1);
      expect(faces[0]).toMatchObject({
        id: "face_1",
        confidence: 0.92,
        attributes: {
          gender: "male",
          expression: "neutral"
        }
      });
    });

    it("should extract dominant colors with hex codes", async () => {
      vi.spyOn(analyzer as any, "callGeminiVision").mockResolvedValueOnce({
        success: true,
        data: [
          {
            hex: "#3A4D5C",
            rgb: { r: 58, g: 77, b: 92 },
            name: "slate blue",
            percentage: 35.2,
            classification: "background"
          },
          {
            hex: "#FFFFFF",
            rgb: { r: 255, g: 255, b: 255 },
            name: "white",
            percentage: 25.8,
            classification: "foreground"
          }
        ]
      });

      const input: ImageAnalyzerInput = {
        imageId: "test-color-1",
        imageData: testImageBuffer,
        mimeType: "image/jpeg",
        fileSizeBytes: testImageBuffer.length
      };

      const colors = await analyzer.extractColors(input);

      expect(colors).toHaveLength(2);
      expect(colors[0]).toMatchObject({
        hex: "#3A4D5C",
        rgb: { r: 58, g: 77, b: 92 },
        percentage: 35.2
      });
      expect(colors[0].percentage).toBeGreaterThanOrEqual(colors[1].percentage);
    });

    it("should extract geo hints with confidence", async () => {
      vi.spyOn(analyzer as any, "callGeminiVision").mockResolvedValueOnce({
        success: true,
        data: [
          {
            hintType: "landmark",
            value: "Statue of Liberty",
            confidence: 0.85,
            coordinates: { latitude: 40.6892, longitude: -74.0445 },
            source: "visual_analysis"
          }
        ]
      });

      const input: ImageAnalyzerInput = {
        imageId: "test-geo-1",
        imageData: testImageBuffer,
        mimeType: "image/jpeg",
        fileSizeBytes: testImageBuffer.length
      };

      const hints = await analyzer.extractGeoHints(input, "New York harbor scene");

      expect(hints).toHaveLength(1);
      expect(hints[0]).toMatchObject({
        hintType: "landmark",
        value: "Statue of Liberty",
        confidence: 0.85,
        coordinates: { latitude: 40.6892, longitude: -74.0445 }
      });
    });

    it("should generate scene description", async () => {
      vi.spyOn(analyzer as any, "callGeminiVision").mockResolvedValueOnce({
        success: true,
        data: "A formal indoor photograph showing a person in business attire."
      });

      const input: ImageAnalyzerInput = {
        imageId: "test-scene-1",
        imageData: testImageBuffer,
        mimeType: "image/jpeg",
        fileSizeBytes: testImageBuffer.length
      };

      const scene = await analyzer.analyzeScene(input);

      expect(scene).toBe("A formal indoor photograph showing a person in business attire.");
      expect(scene.length).toBeLessThanOrEqual(200);
    });
  });

  // ==========================================================================
  // INTEGRATION TESTS (FULL FLOW)
  // ==========================================================================

  describe("Full Extraction Flow", () => {
    it("should return ImageAnalysisResult with correct type", async () => {
      vi.spyOn(analyzer as any, "ensureHealthy").mockResolvedValueOnce(undefined);

      const input: ImageAnalyzerInput = {
        imageId: "test-integration-1",
        imageData: testImageBuffer,
        mimeType: "image/jpeg",
        fileSizeBytes: testImageBuffer.length,
        originalFilename: "photo.jpg"
      };

      const result = await analyzer.extract(input);

      expect(result.type).toBe("image_analysis");
      expect(result.metadata).toBeDefined();
      expect(result.metadata.imageId).toBe("test-integration-1");
      expect(result.metadata.analyzedWithModel).toBe("gemini-2.0-flash-latest");
      expect(result.metadata.analyzedAt).toBeDefined();
      expect(typeof result.metadata.analysisConfidence).toBe("number");
    });

    it("should include all metadata fields in response", async () => {
      vi.spyOn(analyzer as any, "ensureHealthy").mockResolvedValueOnce(undefined);

      const input: ImageAnalyzerInput = {
        imageId: "test-conf-1",
        imageData: testImageBuffer,
        mimeType: "image/jpeg",
        fileSizeBytes: testImageBuffer.length
      };

      const result = await analyzer.extract(input);

      expect(result.metadata).toHaveProperty("imageId");
      expect(result.metadata).toHaveProperty("mimeType");
      expect(result.metadata).toHaveProperty("objects");
      expect(result.metadata).toHaveProperty("faces");
      expect(result.metadata).toHaveProperty("colors");
      expect(result.metadata).toHaveProperty("geoHints");
      expect(result.metadata).toHaveProperty("sceneDescription");
      expect(result.metadata).toHaveProperty("analysisConfidence");
      expect(result.metadata).toHaveProperty("analyzedAt");
      expect(result.metadata).toHaveProperty("analyzedWithModel");
    });
  });

  // ==========================================================================
  // ERROR HANDLING & DEGRADATION TESTS
  // ==========================================================================

  describe("Error Handling & Graceful Degradation", () => {
    it("should gracefully handle object extraction failure", async () => {
      vi.spyOn(analyzer as any, "ensureHealthy").mockResolvedValueOnce(undefined);
      vi.spyOn(analyzer as any, "callGeminiVision")
        .mockRejectedValueOnce(new Error("API error"))
        .mockResolvedValueOnce({ success: true, data: [] })
        .mockResolvedValueOnce({ success: true, data: [] })
        .mockResolvedValueOnce({ success: true, data: "Scene" })
        .mockResolvedValueOnce({ success: true, data: [] });

      const input: ImageAnalyzerInput = {
        imageId: "test-err-1",
        imageData: testImageBuffer,
        mimeType: "image/jpeg",
        fileSizeBytes: testImageBuffer.length
      };

      const result = await analyzer.extract(input);

      expect(result.metadata.warnings).toBeDefined();
      expect(result.metadata.warnings!.length).toBeGreaterThan(0);
      expect(result.metadata.objects).toEqual([]);
    });

    it("should return metadata with error field when face extraction fails", async () => {
      vi.spyOn(analyzer as any, "ensureHealthy").mockResolvedValueOnce(undefined);
      vi.spyOn(analyzer as any, "callGeminiVision")
        .mockResolvedValueOnce({ success: true, data: [] })
        .mockRejectedValueOnce(new Error("Face detection failed"))
        .mockResolvedValueOnce({ success: true, data: [] })
        .mockResolvedValueOnce({ success: true, data: "Scene" })
        .mockResolvedValueOnce({ success: true, data: [] });

      const input: ImageAnalyzerInput = {
        imageId: "test-face-err-1",
        imageData: testImageBuffer,
        mimeType: "image/jpeg",
        fileSizeBytes: testImageBuffer.length
      };

      const result = await analyzer.extract(input);

      expect(result.metadata.faces).toEqual([]);
      expect(result.metadata.warnings).toBeDefined();
    });

    it("should handle partial failures with degradation", async () => {
      vi.spyOn(analyzer as any, "ensureHealthy").mockResolvedValueOnce(undefined);

      // Mock callGeminiVision with explicit implementation
      const calls: string[] = [];
      vi.spyOn(analyzer as any, "callGeminiVision")
        .mockImplementation(async (input: any, prompt: string, type: string) => {
          calls.push(type);
          if (type === "objects") {
            return { success: true, data: [{ label: "obj", confidence: 0.8 }] };
          } else if (type === "faces") {
            return { success: true, data: [] };
          } else if (type === "colors") {
            return { success: true, data: [{ hex: "#FFF", rgb: { r: 255, g: 255, b: 255 }, percentage: 100 }] };
          } else if (type === "scene") {
            return { success: true, data: "Scene" };
          } else if (type === "geo_hints") {
            throw new Error("Geo error");
          }
          return { success: false };
        });

      const input: ImageAnalyzerInput = {
        imageId: "test-partial-1",
        imageData: testImageBuffer,
        mimeType: "image/jpeg",
        fileSizeBytes: testImageBuffer.length
      };

      const result = await analyzer.extract(input);

      expect(result.metadata.objects).toHaveLength(1);
      expect(result.metadata.faces).toEqual([]);
      expect(result.metadata.colors).toHaveLength(1);
      expect(result.metadata.geoHints).toEqual([]);
      expect(result.metadata.warnings).toBeDefined();
    });
  });

  // ==========================================================================
  // CONFIDENCE & FILTERING TESTS
  // ==========================================================================

  describe("Confidence Threshold Filtering", () => {
    it("should filter objects below confidence threshold", async () => {
      vi.spyOn(analyzer as any, "callGeminiVision").mockResolvedValueOnce({
        success: true,
        data: [
          { label: "high", confidence: 0.9 },
          { label: "low", confidence: 0.4 }, // Below 0.6 threshold
          { label: "medium", confidence: 0.7 }
        ]
      });

      const input: ImageAnalyzerInput = {
        imageId: "test-threshold-1",
        imageData: testImageBuffer,
        mimeType: "image/jpeg",
        fileSizeBytes: testImageBuffer.length
      };

      const objects = await analyzer.extractObjects(input);

      expect(objects).toHaveLength(2);
      expect(objects.map(o => o.confidence)).toEqual([0.9, 0.7]);
    });

    it("should filter faces below confidence threshold", async () => {
      vi.spyOn(analyzer as any, "callGeminiVision").mockResolvedValueOnce({
        success: true,
        data: [
          { id: "f1", confidence: 0.95 },
          { id: "f2", confidence: 0.5 }, // Below threshold
          { id: "f3", confidence: 0.75 }
        ]
      });

      const input: ImageAnalyzerInput = {
        imageId: "test-face-threshold-1",
        imageData: testImageBuffer,
        mimeType: "image/jpeg",
        fileSizeBytes: testImageBuffer.length
      };

      const faces = await analyzer.extractFaces(input);

      expect(faces).toHaveLength(2);
      expect(faces.map(f => f.confidence)).toEqual([0.95, 0.75]);
    });
  });

  // ==========================================================================
  // RETRY & TIMEOUT TESTS
  // ==========================================================================

  describe("Retry Logic & Timeouts", () => {
    it("should retry on 429 rate limit error", async () => {
      const delayMs = 2000;
      vi.useFakeTimers();

      const error429 = new Error("Rate limited");
      (error429 as any).status = 429;

      let callCount = 0;
      const mock = vi.spyOn(analyzer as any, "callGeminiVisionInternal")
        .mockImplementationOnce(() => {
          callCount++;
          throw error429;
        })
        .mockResolvedValueOnce({ success: true, data: [] });

      const input: ImageAnalyzerInput = {
        imageId: "test-retry-1",
        imageData: testImageBuffer,
        mimeType: "image/jpeg",
        fileSizeBytes: testImageBuffer.length
      };

      const promise = analyzer["callGeminiVision"](input, "test prompt", "objects");

      vi.advanceTimersByTime(delayMs + 100);
      await promise;

      expect(callCount).toBe(1); // First call fails
      vi.useRealTimers();
    });

    it("should not retry on 401 authentication error", async () => {
      const error401 = new Error("Unauthorized");
      (error401 as any).status = 401;

      const mock = vi.spyOn(analyzer as any, "callGeminiVisionInternal")
        .mockRejectedValueOnce(error401);

      const input: ImageAnalyzerInput = {
        imageId: "test-auth-err-1",
        imageData: testImageBuffer,
        mimeType: "image/jpeg",
        fileSizeBytes: testImageBuffer.length
      };

      // Auth errors throw immediately
      await expect(analyzer["callGeminiVision"](input, "test", "objects")).rejects.toThrow(
        /Authentication failed/
      );
    });
  });

  // ==========================================================================
  // HEALTHCHECK TESTS
  // ==========================================================================

  describe("Healthcheck", () => {
    it("should pass healthcheck with valid API key", async () => {
      vi.spyOn(analyzer as any, "getGeminiClient").mockResolvedValueOnce({
        getGenerativeModel: vi.fn(() => ({
          generateContent: vi.fn().mockResolvedValueOnce({
            response: {
              text: () => "OK"
            }
          })
        }))
      });

      await expect(analyzer["ensureHealthy"]()).resolves.not.toThrow();
      expect(analyzer["isHealthy"]).toBe(true);
    });

    it("should fail healthcheck when API key is empty", () => {
      process.env.GOOGLE_AI_API_KEY = "";

      expect(() => {
        new ImageAnalyzerV3();
      }).toThrow(/GOOGLE_AI_API_KEY/);
    });
  });

  // ==========================================================================
  // AGGREGATE CONFIDENCE COMPUTATION
  // ==========================================================================

  describe("Aggregate Confidence Computation", () => {
    it("should compute weighted average of feature confidences", () => {
      const metadata: ImageMetadata = {
        imageId: "test",
        mimeType: "image/jpeg",
        objects: [
          { label: "obj1", confidence: 0.8 },
          { label: "obj2", confidence: 0.9 }
        ],
        faces: [
          { id: "f1", confidence: 0.95, boundingBox: { top: 0, left: 0, width: 50, height: 50 } }
        ],
        colors: [
          { hex: "#000", rgb: { r: 0, g: 0, b: 0 }, percentage: 60 }
        ],
        geoHints: [
          { hintType: "landmark", value: "place", confidence: 0.7 }
        ],
        sceneDescription: "A scene",
        analysisConfidence: 0,
        analyzedAt: new Date().toISOString(),
        analyzedWithModel: "gemini-2.0-flash-latest"
      };

      const confidence = analyzer["computeAggregateConfidence"](metadata);

      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it("should return 0 when no features detected", () => {
      const metadata: ImageMetadata = {
        imageId: "test",
        mimeType: "image/jpeg",
        objects: [],
        faces: [],
        colors: [],
        geoHints: [],
        sceneDescription: "",
        analysisConfidence: 0,
        analyzedAt: new Date().toISOString(),
        analyzedWithModel: "gemini-2.0-flash-latest"
      };

      const confidence = analyzer["computeAggregateConfidence"](metadata);

      expect(confidence).toBe(0);
    });
  });

  // ==========================================================================
  // RESPONSE PARSING TESTS
  // ==========================================================================

  describe("Response Parsing", () => {
    it("should handle JSON array responses", async () => {
      vi.spyOn(analyzer as any, "callGeminiVision").mockResolvedValueOnce({
        success: true,
        data: JSON.stringify([
          { label: "person", confidence: 0.9 }
        ])
      });

      const input: ImageAnalyzerInput = {
        imageId: "test",
        imageData: testImageBuffer,
        mimeType: "image/jpeg",
        fileSizeBytes: testImageBuffer.length
      };

      const objects = await analyzer.extractObjects(input);

      expect(objects).toHaveLength(1);
    });

    it("should handle direct object responses", async () => {
      vi.spyOn(analyzer as any, "callGeminiVision").mockResolvedValueOnce({
        success: true,
        data: "A beautiful landscape with trees and mountains in the distance."
      });

      const input: ImageAnalyzerInput = {
        imageId: "test",
        imageData: testImageBuffer,
        mimeType: "image/jpeg",
        fileSizeBytes: testImageBuffer.length
      };

      const scene = await analyzer.analyzeScene(input);

      expect(scene).toContain("landscape");
    });

    it("should handle failed responses gracefully", async () => {
      vi.spyOn(analyzer as any, "callGeminiVision").mockResolvedValueOnce({
        success: false,
        error: "API error"
      });

      const input: ImageAnalyzerInput = {
        imageId: "test",
        imageData: testImageBuffer,
        mimeType: "image/jpeg",
        fileSizeBytes: testImageBuffer.length
      };

      const objects = await analyzer.extractObjects(input);

      expect(objects).toEqual([]);
    });
  });
});
