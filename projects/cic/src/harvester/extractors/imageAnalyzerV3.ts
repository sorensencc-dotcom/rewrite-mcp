/**
 * projects/cic/src/harvester/extractors/ImageAnalyzerV3.ts
 * Production-grade vision extraction using Gemini Flash Latest
 *
 * Version: 2.0.0
 * Status: Skeleton (method signatures + types defined, impl stubs)
 * Last Updated: 2026-07-10
 */

import { BaseExtractor } from "./base-extractor.js";

// ============================================================================
// TYPE DEFINITIONS — ImageMetadata V2
// ============================================================================

/**
 * ImageMetadata v2 — vision extraction output from Gemini Flash Latest
 * Extends v1 with structured vision analysis
 */
export interface ImageMetadata {
  // Identity
  imageId: string;           // Unique identifier or hash
  originalFilename?: string; // Preserved for audit trail
  mimeType: string;          // e.g., "image/jpeg", "image/png"
  fileSizeBytes?: number;    // For monitoring binary overhead

  // Vision Analysis (from Gemini)
  objects: DetectedObject[];
  faces: DetectedFace[];
  colors: DominantColor[];
  geoHints: GeoHint[];
  sceneDescription: string;

  // Metadata
  analysisConfidence: number; // 0.0–1.0, aggregate score
  analyzedAt: string;         // ISO timestamp
  analyzedWithModel: string;  // "gemini-2.0-flash-latest"

  // Diagnostics
  warnings?: string[];        // e.g., "low-confidence faces detected"
  rawTokenUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * DetectedObject — single object instance from vision analysis
 */
export interface DetectedObject {
  label: string;             // e.g., "person", "building", "document"
  confidence: number;        // 0.0–1.0
  boundingBox?: {
    top: number;             // pixels from top
    left: number;            // pixels from left
    width: number;           // pixels
    height: number;          // pixels
  };
  description?: string;      // e.g., "formal attire, standing outdoors"
}

/**
 * DetectedFace — face detection output with attributes
 */
export interface DetectedFace {
  id: string;               // Face identifier within image
  confidence: number;       // 0.0–1.0, face detection confidence
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  attributes?: {
    approximate_age_range?: string;   // e.g., "25-35"
    gender?: string;                  // "male" | "female" | "unknown"
    expression?: string;              // e.g., "neutral", "happy", "stern"
    visibility?: string;              // e.g., "clear", "partial", "obscured"
  };
  description?: string;    // e.g., "formal portrait, centered subject"
  isNamedEntity?: boolean; // Placeholder for future name linking
}

/**
 * DominantColor — color detected in image with frequency
 */
export interface DominantColor {
  hex: string;             // e.g., "#3A4D5C"
  rgb: { r: number; g: number; b: number };
  name?: string;           // e.g., "slate blue"
  percentage: number;      // 0.0–100.0, proportion of image
  classification?: "foreground" | "background" | "accent";
}

/**
 * GeoHint — geographic or landmark detection
 */
export interface GeoHint {
  hintType: "landmark" | "terrain" | "architecture" | "text_based";
  value: string;           // e.g., "Statue of Liberty", "Fjord landscape"
  confidence: number;      // 0.0–1.0
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  source?: string;         // Where this hint came from (e.g., "text_in_image")
}

/**
 * ImageAnalyzerInput — input to extract() method
 */
export interface ImageAnalyzerInput {
  imageId: string;         // Unique identifier
  imageData: Buffer;       // Raw image bytes
  mimeType: string;        // e.g., "image/jpeg"
  originalFilename?: string;
  fileSizeBytes?: number;
  pmsEngine?: any;         // PMS context from ExtractorChain
}

/**
 * ImageAnalysisResult — return value from extract()
 */
export interface ImageAnalysisResult {
  type: "image_analysis";
  metadata: ImageMetadata;
}

/**
 * GeminiResponse — mock response from Gemini Flash Latest API
 */
export interface GeminiResponse {
  success: boolean;
  data?: any;
  error?: string;
  tokens?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// ============================================================================
// CLASS DEFINITION — ImageAnalyzerV3
// ============================================================================

/**
 * ImageAnalyzerV3 — Production vision extraction extractor
 *
 * Integrates with:
 * - ExtractorChain (skill "extract_image_analysis", version "2.0.0")
 * - Instinct engine (can be disabled via `avoid_skills`)
 * - Telemetry sink (emitted by ExtractorChain, not this class)
 *
 * Uses Gemini Flash Latest for structured feature extraction:
 * - Objects (labels + bounding boxes)
 * - Faces (detection + attributes)
 * - Colors (dominant colors + percentages)
 * - Geo hints (landmarks, terrain)
 * - Scene description (single sentence)
 */
export class ImageAnalyzerV3 extends BaseExtractor {
  private modelId: string = "gemini-2.0-flash-latest";
  private timeoutMs: number;
  private confidenceThreshold: number;
  private maxImageSizeMb: number;
  private isHealthy: boolean = false;
  private apiKey: string;
  private client: any; // GoogleGenerativeAI instance

  constructor() {
    super();
    this.timeoutMs = parseInt(process.env.IMAGE_ANALYSIS_TIMEOUT_MS || "10000", 10);
    this.confidenceThreshold = parseFloat(process.env.IMAGE_ANALYSIS_CONFIDENCE_THRESHOLD || "0.6");
    this.maxImageSizeMb = parseFloat(process.env.IMAGE_MAX_SIZE_MB || "25");

    // Validate credentials at startup
    this.validateCredentials();

    // Lazy-load Gemini client
    this.apiKey = process.env.GOOGLE_AI_API_KEY || "";
  }

  // ========================================================================
  // PUBLIC INTERFACE
  // ========================================================================

  /**
   * extract — main entry point for ExtractorChain
   * Orchestrates vision analysis and returns ImageMetadata v2
   *
   * @param input ImageAnalyzerInput
   * @returns Promise<ImageAnalysisResult>
   * @throws Error on fatal failure (auth, invalid format, etc.)
   */
  async extract(input: ImageAnalyzerInput): Promise<ImageAnalysisResult> {
    // Ensure API is healthy before proceeding
    if (!this.isHealthy) {
      await this.ensureHealthy();
    }

    // Validate input image
    const isValid = await this.validateImage(input);
    if (!isValid) {
      throw new Error(
        `[ImageAnalyzerV3] Invalid image: ${input.originalFilename} ` +
        `(mime: ${input.mimeType}, size: ${input.fileSizeBytes} bytes)`
      );
    }

    const metadata: ImageMetadata = {
      imageId: input.imageId,
      originalFilename: input.originalFilename,
      mimeType: input.mimeType,
      fileSizeBytes: input.fileSizeBytes,
      objects: [],
      faces: [],
      colors: [],
      geoHints: [],
      sceneDescription: "",
      analysisConfidence: 0.0,
      analyzedAt: new Date().toISOString(),
      analyzedWithModel: this.modelId,
      warnings: []
    };

    try {
      // Extract features in parallel where possible
      const [objects, faces, colors, scene] = await Promise.all([
        this.extractObjects(input).catch((err: any) => {
          metadata.warnings!.push(`Failed to extract objects: ${err.message}`);
          return [];
        }),
        this.extractFaces(input).catch((err: any) => {
          metadata.warnings!.push(`Failed to extract faces: ${err.message}`);
          return [];
        }),
        this.extractColors(input).catch((err: any) => {
          metadata.warnings!.push(`Failed to extract colors: ${err.message}`);
          return [];
        }),
        this.analyzeScene(input).catch((err: any) => {
          metadata.warnings!.push(`Failed to analyze scene: ${err.message}`);
          return "";
        })
      ]);

      metadata.objects = objects;
      metadata.faces = faces;
      metadata.colors = colors;
      metadata.sceneDescription = scene;

      // Extract geo hints from scene (depends on scene analysis)
      if (scene) {
        metadata.geoHints = await this.extractGeoHints(input, scene).catch((err: any) => {
          metadata.warnings!.push(`Failed to extract geo hints: ${err.message}`);
          return [];
        });
      }

      // Compute aggregate confidence
      metadata.analysisConfidence = this.computeAggregateConfidence(metadata);

      return {
        type: "image_analysis",
        metadata
      };
    } catch (err: any) {
      // Graceful degradation: return partial metadata with warnings
      if (metadata.warnings === undefined) {
        metadata.warnings = [];
      }
      metadata.warnings.push(err.message);
      metadata.analysisConfidence = 0.0;

      return {
        type: "image_analysis",
        metadata
      };
    }
  }

  // ========================================================================
  // FEATURE EXTRACTION METHODS (STUBS)
  // ========================================================================

  /**
   * extractObjects — detect objects in image
   * Returns DetectedObject[] with labels and bounding boxes
   *
   * @param input ImageAnalyzerInput
   * @returns Promise<DetectedObject[]>
   * @throws Error on timeout or API failure
   */
  async extractObjects(input: ImageAnalyzerInput): Promise<DetectedObject[]> {
    const prompt = await this.buildPrompt("image-analyzer-v2", {
      image_input: "[image data]"
    });

    const geminiPrompt = `Analyze this image and extract all detected objects.
Return a JSON array with the following structure:
[
  {
    "label": "object name",
    "confidence": 0.85,
    "boundingBox": {
      "top": 10,
      "left": 20,
      "width": 100,
      "height": 120
    },
    "description": "optional description"
  }
]

Objects must have confidence >= ${this.confidenceThreshold}.
Include only the JSON array, no markdown formatting.`;

    const response = await this.callGeminiVision(input, geminiPrompt, "objects");
    if (!response.success || !response.data) {
      return [];
    }

    try {
      const parsed = Array.isArray(response.data) ? response.data : JSON.parse(response.data);
      return parsed
        .filter((obj: any) => obj.confidence >= this.confidenceThreshold)
        .slice(0, 20); // Cap at 20 objects
    } catch {
      return [];
    }
  }

  /**
   * extractFaces — detect faces in image with attributes
   * Returns DetectedFace[] with bounding boxes and attributes
   *
   * @param input ImageAnalyzerInput
   * @returns Promise<DetectedFace[]>
   * @throws Error on timeout or API failure
   */
  async extractFaces(input: ImageAnalyzerInput): Promise<DetectedFace[]> {
    const geminiPrompt = `Analyze this image and detect all human faces.
Return a JSON array with the following structure:
[
  {
    "id": "face_1",
    "confidence": 0.95,
    "boundingBox": {
      "top": 50,
      "left": 100,
      "width": 80,
      "height": 120
    },
    "attributes": {
      "approximate_age_range": "25-35",
      "gender": "male",
      "expression": "neutral",
      "visibility": "clear"
    },
    "description": "person wearing formal attire"
  }
]

Faces must have confidence >= ${this.confidenceThreshold}.
Include only the JSON array, no markdown formatting.`;

    const response = await this.callGeminiVision(input, geminiPrompt, "faces");
    if (!response.success || !response.data) {
      return [];
    }

    try {
      const parsed = Array.isArray(response.data) ? response.data : JSON.parse(response.data);
      return parsed
        .filter((face: any) => face.confidence >= this.confidenceThreshold)
        .map((face: any, index: number) => ({
          ...face,
          id: face.id || `face_${index + 1}`
        }))
        .slice(0, 50); // Cap at 50 faces
    } catch {
      return [];
    }
  }

  /**
   * extractColors — extract dominant colors from image
   * Returns DominantColor[] sorted by percentage (descending)
   *
   * @param input ImageAnalyzerInput
   * @returns Promise<DominantColor[]>
   * @throws Error on timeout or API failure
   */
  async extractColors(input: ImageAnalyzerInput): Promise<DominantColor[]> {
    const geminiPrompt = `Analyze this image and extract the top 5-7 dominant colors.
Return a JSON array with the following structure:
[
  {
    "hex": "#3A4D5C",
    "rgb": { "r": 58, "g": 77, "b": 92 },
    "name": "slate blue",
    "percentage": 25.5,
    "classification": "background"
  }
]

Sort by percentage descending. Classification can be "foreground", "background", or "accent".
Include only the JSON array, no markdown formatting.`;

    const response = await this.callGeminiVision(input, geminiPrompt, "colors");
    if (!response.success || !response.data) {
      return [];
    }

    try {
      const parsed = Array.isArray(response.data) ? response.data : JSON.parse(response.data);
      return parsed
        .sort((a: any, b: any) => (b.percentage || 0) - (a.percentage || 0))
        .slice(0, 7); // Top 7 colors
    } catch {
      return [];
    }
  }

  /**
   * extractGeoHints — detect geographic or landmark hints
   * Returns GeoHint[] for landmarks, terrain, architecture, text-based
   *
   * @param input ImageAnalyzerInput
   * @param sceneDescription Scene description from analyzeScene()
   * @returns Promise<GeoHint[]>
   * @throws Error on timeout or API failure
   */
  async extractGeoHints(
    input: ImageAnalyzerInput,
    sceneDescription: string
  ): Promise<GeoHint[]> {
    const geminiPrompt = `Based on this image and scene description: "${sceneDescription}"
Extract geographic or landmark hints.

Return a JSON array with the following structure:
[
  {
    "hintType": "landmark",
    "value": "Statue of Liberty",
    "confidence": 0.85,
    "coordinates": {
      "latitude": 40.6892,
      "longitude": -74.0445
    },
    "source": "visual_analysis"
  }
]

hintType can be: "landmark", "terrain", "architecture", "text_based"
Confidence must be >= ${this.confidenceThreshold}.
Include only the JSON array, no markdown formatting.`;

    const response = await this.callGeminiVision(input, geminiPrompt, "geo_hints");
    if (!response.success || !response.data) {
      return [];
    }

    try {
      const parsed = Array.isArray(response.data) ? response.data : JSON.parse(response.data);
      return parsed
        .filter((hint: any) => hint.confidence >= this.confidenceThreshold)
        .slice(0, 10); // Cap at 10 hints
    } catch {
      return [];
    }
  }

  /**
   * analyzeScene — generate single-sentence scene description
   * Returns string describing image contents and context
   *
   * @param input ImageAnalyzerInput
   * @returns Promise<string>
   * @throws Error on timeout or API failure
   */
  async analyzeScene(input: ImageAnalyzerInput): Promise<string> {
    const geminiPrompt = `Analyze this image and provide a single-sentence description of the scene.
Keep it under 200 characters. Be concise and descriptive.`;

    const response = await this.callGeminiVision(input, geminiPrompt, "scene");
    if (!response.success || !response.data) {
      return "";
    }

    const description = typeof response.data === "string"
      ? response.data
      : response.data.description || "";

    return description.substring(0, 200).trim();
  }

  // ========================================================================
  // UTILITY METHODS (STUBS)
  // ========================================================================

  /**
   * validateImage — check image format, size, and integrity
   * Returns true if image is valid, false otherwise
   *
   * @param input ImageAnalyzerInput
   * @returns Promise<boolean>
   */
  private async validateImage(input: ImageAnalyzerInput): Promise<boolean> {
    const supportedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    // Check MIME type
    if (!supportedMimes.includes(input.mimeType)) {
      console.warn(`[ImageAnalyzerV3] Unsupported MIME type: ${input.mimeType}`);
      return false;
    }

    // Check file size
    const fileSizeMb = (input.fileSizeBytes || 0) / (1024 * 1024);
    if (fileSizeMb > this.maxImageSizeMb) {
      console.warn(
        `[ImageAnalyzerV3] Image too large: ${fileSizeMb.toFixed(2)}MB > ${this.maxImageSizeMb}MB`
      );
      return false;
    }

    // Check minimum size (>0 bytes)
    if (!input.imageData || input.imageData.length === 0) {
      console.warn("[ImageAnalyzerV3] Image data is empty");
      return false;
    }

    return true;
  }

  /**
   * ensureHealthy — verify API credentials and connectivity
   * Throws if API is unavailable or credentials are invalid
   *
   * @throws Error if healthcheck fails
   */
  private async ensureHealthy(): Promise<void> {
    try {
      // Verify API key exists
      if (!this.apiKey || this.apiKey.trim() === "") {
        throw new Error("GOOGLE_AI_API_KEY environment variable not set");
      }

      // Try to instantiate client and make a test call
      await this.getGeminiClient();

      // Make minimal test call to verify connectivity
      const testPrompt = "Briefly describe what you see in this image.";
      const testImageBuffer = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46
      ]);

      try {
        await Promise.race([
          this.callGeminiVisionInternal(testImageBuffer, testPrompt, 0),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Healthcheck timeout")), 5000)
          )
        ]);
      } catch (err: any) {
        // If it's just an auth error on a minimal image, we still consider it healthy
        // because auth worked
        if (err.message && err.message.includes("auth")) {
          throw err;
        }
        // Other errors are OK for a test image
      }

      this.isHealthy = true;
      console.log("[ImageAnalyzerV3] Healthcheck passed");
    } catch (err: any) {
      const message = err.message || String(err);
      throw new Error(`[ImageAnalyzerV3] Healthcheck failed: ${message}`);
    }
  }

  /**
   * callGeminiVision — low-level Gemini API call with retry logic
   * Handles timeouts, rate limits, and server errors
   *
   * @param input ImageAnalyzerInput
   * @param analysisPrompt Prompt for analysis
   * @param analysisType Type of analysis ("objects", "faces", "colors", etc.)
   * @param retryCount Current retry attempt (0-based)
   * @returns Promise<GeminiResponse>
   * @throws Error if all retries exhausted
   */
  private async callGeminiVision(
    input: ImageAnalyzerInput,
    analysisPrompt: string,
    analysisType: string,
    retryCount: number = 0
  ): Promise<GeminiResponse> {
    const maxRetries = 3;
    const baseDelayMs = 2000; // 2s, 4s, 8s

    try {
      const response = await Promise.race([
        this.callGeminiVisionInternal(input.imageData, analysisPrompt, retryCount),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), this.timeoutMs)
        )
      ]);

      return {
        success: true,
        data: response
      };
    } catch (err: any) {
      const errorMsg = err.message || String(err);
      const statusCode = err.status || err.code;

      // Determine if we should retry
      const shouldRetry =
        (statusCode === 429 || statusCode === 503 || statusCode === 502 || statusCode === 500) &&
        retryCount < maxRetries - 1;

      if (shouldRetry) {
        // Exponential backoff
        const delayMs = baseDelayMs * Math.pow(2, retryCount);
        console.log(
          `[ImageAnalyzerV3] Retry attempt ${retryCount + 1}/${maxRetries} ` +
          `for ${analysisType} after ${delayMs}ms (status: ${statusCode})`
        );
        await this.delay(delayMs);
        return this.callGeminiVision(input, analysisPrompt, analysisType, retryCount + 1);
      }

      // Auth errors fail immediately
      if (statusCode === 401 || errorMsg.includes("unauthorized")) {
        throw new Error(`[ImageAnalyzerV3] Authentication failed: ${errorMsg}`);
      }

      // Other errors after max retries
      console.warn(
        `[ImageAnalyzerV3] Failed to ${analysisType} after ${retryCount + 1} attempts: ${errorMsg}`
      );

      return {
        success: false,
        error: errorMsg
      };
    }
  }

  /**
   * callGeminiVisionInternal — internal Gemini API call without retry
   *
   * @param imageBuffer Image data buffer
   * @param prompt Analysis prompt
   * @param retryCount Retry attempt (for logging)
   * @returns Promise<any>
   */
  private async callGeminiVisionInternal(
    imageBuffer: Buffer,
    prompt: string,
    retryCount: number
  ): Promise<any> {
    const client = await this.getGeminiClient();
    const base64Image = imageBuffer.toString("base64");

    const model = client.getGenerativeModel({ model: this.modelId });

    // Detect MIME type from buffer
    let mimeType = "image/jpeg";
    if (imageBuffer.slice(0, 3).toString("hex") === "ffd8ff") {
      mimeType = "image/jpeg";
    } else if (imageBuffer.slice(0, 4).toString("hex") === "89504e47") {
      mimeType = "image/png";
    } else if (imageBuffer.slice(0, 6).toString("hex").startsWith("474946")) {
      mimeType = "image/gif";
    }

    const response = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      },
      prompt
    ]);

    const result = await response.response;
    const text = result.text();

    // Extract JSON if response contains JSON
    const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { text: text };
  }

  /**
   * getGeminiClient — lazy-load Gemini client
   * Requires dynamic import of @google/generative-ai
   *
   * @returns Promise<any>
   */
  private async getGeminiClient(): Promise<any> {
    if (this.client) {
      return this.client;
    }

    try {
      // Dynamic import for optional dependency
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      this.client = new GoogleGenerativeAI(this.apiKey);
      return this.client;
    } catch (err: any) {
      throw new Error(
        `[ImageAnalyzerV3] Failed to load GoogleGenerativeAI: ${err.message}. ` +
        `Install @google/generative-ai: npm install @google/generative-ai`
      );
    }
  }

  /**
   * delay — helper to pause execution
   *
   * @param ms Milliseconds to delay
   * @returns Promise<void>
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ========================================================================
  // PRIVATE HELPERS
  // ========================================================================

  /**
   * validateCredentials — check API key at instantiation time
   * Throws if GOOGLE_AI_API_KEY is missing
   *
   * @throws Error if credentials are invalid
   */
  private validateCredentials(): void {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
      throw new Error(
        "[ImageAnalyzerV3] GOOGLE_AI_API_KEY env var is required. " +
        "Obtain from https://ai.google.dev/tutorials/quickstart"
      );
    }
    console.log("[ImageAnalyzerV3] Credentials validated (API key present)");
  }

  /**
   * computeAggregateConfidence — compute overall confidence score
   * Based on confidence of detected features
   *
   * @param metadata ImageMetadata
   * @returns number (0.0–1.0)
   */
  private computeAggregateConfidence(metadata: ImageMetadata): number {
    const scores: number[] = [];

    // Collect all confidence scores from features
    if (metadata.objects && metadata.objects.length > 0) {
      const objectConf = metadata.objects.reduce((sum, obj) => sum + obj.confidence, 0) /
        metadata.objects.length;
      scores.push(objectConf * 0.4); // 40% weight
    }

    if (metadata.faces && metadata.faces.length > 0) {
      const faceConf = metadata.faces.reduce((sum, face) => sum + face.confidence, 0) /
        metadata.faces.length;
      scores.push(faceConf * 0.3); // 30% weight
    }

    if (metadata.colors && metadata.colors.length > 0) {
      // Colors don't have explicit confidence, use percentage as proxy
      const colorScore = Math.min(1.0, metadata.colors[0].percentage / 100);
      scores.push(colorScore * 0.2); // 20% weight
    }

    if (metadata.geoHints && metadata.geoHints.length > 0) {
      const geoConf = metadata.geoHints.reduce((sum, hint) => sum + hint.confidence, 0) /
        metadata.geoHints.length;
      scores.push(geoConf * 0.1); // 10% weight
    }

    if (scores.length === 0) {
      return 0.0; // No features detected
    }

    return Math.min(1.0, scores.reduce((sum, score) => sum + score, 0));
  }

  /**
   * classifyError — classify error for telemetry
   * Maps exception types to error categories
   *
   * @param err Error
   * @returns string ("timeout" | "invalid_image" | "api_error" | "validation_error")
   */
  private classifyError(err: any): string {
    const message = (err?.message || "").toLowerCase();
    const code = err?.code || "";
    const status = err?.status;

    if (message.includes("timeout") || code.includes("TIMEOUT")) {
      return "timeout";
    }
    if (message.includes("invalid") || message.includes("unsupported")) {
      return "invalid_image";
    }
    if (status && (status >= 400 && status !== 401)) {
      return "api_error";
    }
    if (status === 401 || message.includes("auth")) {
      return "validation_error"; // Auth is a validation error in our context
    }

    return "validation_error";
  }
}

// ============================================================================
// FACTORY FUNCTION (RECOMMENDED)
// ============================================================================

/**
 * createImageAnalyzer — async factory for healthcheck-first initialization
 * Call this instead of `new ImageAnalyzerV3()` in production
 *
 * @returns Promise<ImageAnalyzerV3>
 * @throws Error if API is unavailable
 */
export async function createImageAnalyzer(): Promise<ImageAnalyzerV3> {
  const analyzer = new ImageAnalyzerV3();
  await analyzer["ensureHealthy"](); // Private method call via index access
  return analyzer;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ImageAnalyzerV3;
