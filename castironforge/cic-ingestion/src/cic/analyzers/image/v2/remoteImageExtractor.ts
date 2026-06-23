// remoteImageExtractor.ts
// Cloud vision API wrapper (Gemini Vision)
// Handles API calls, token counting, retry logic, error handling
// Version: 1.0.0 — Ready for Gemini Vision API integration

import type { FileRecord } from '../../types/fileRecord.js';
import * as fs from 'fs/promises';

/**
 * RemoteExtractResult — Output from remote API extraction.
 * Includes model metadata, token usage, confidence, and structured data.
 */
export interface RemoteExtractResult {
  modelName: string;
  modelVersion: string;
  tokenUsage?: number; // Total tokens (input + output)
  confidence: number;
  data: unknown;
  errors?: string[];
}

/**
 * API response shape for Gemini Vision API.
 * [ADJUST] if using different API (Claude Vision, etc.)
 */
interface GeminiVisionResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

/**
 * Retry configuration for API calls.
 * Exponential backoff: initial delay doubles on each retry.
 */
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1_000,
  maxDelayMs: 30_000,
  backoffMultiplier: 2,
};

/**
 * RemoteImageExtractor — Wraps Gemini Vision API for image analysis.
 *
 * Responsibilities:
 * - Health check (API key validation, endpoint connectivity)
 * - Supported MIME types (Gemini supports JPEG, PNG, WebP, GIF, TIFF, BMP)
 * - Extract metadata via Gemini Vision API
 * - Token counting for cost tracking
 * - Retry logic with exponential backoff
 * - Error classification and structured error reporting
 */
export class RemoteImageExtractor {
  private apiKey: string;
  private endpoint: string = 'https://generativelanguage.googleapis.com/v1beta/models';
  private modelId: string = 'gemini-1.5-flash'; // or 'gemini-pro-vision' for older models
  private modelVersion: string = '1.5-flash';
  private retryConfig: RetryConfig;

  constructor(options?: { apiKey?: string; modelId?: string; retryConfig?: Partial<RetryConfig> }) {
    this.apiKey = options?.apiKey ?? process.env.GEMINI_API_KEY ?? '';

    if (!this.apiKey) {
      throw new Error(
        '[RemoteImageExtractor] GEMINI_API_KEY not set; set via options or environment'
      );
    }

    if (options?.modelId) {
      this.modelId = options.modelId;
      this.modelVersion = options.modelId;
    }

    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...options?.retryConfig };
  }

  /**
   * Health check: Verify API key validity and endpoint reachable.
   * Performs a minimal API call to check connectivity.
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Attempt a no-op API call to verify credentials
      const response = await fetch(
        `${this.endpoint}/${this.modelId}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: 'ping', // Minimal text; we're not sending an image
                  },
                ],
              },
            ],
            generationConfig: {
              maxOutputTokens: 1, // Minimal output
            },
          }),
        }
      );

      // 200 or 400 (invalid input) means API is reachable
      // 401 (auth) or 403 (forbidden) means API key is bad
      if (response.status === 401 || response.status === 403) {
        return false; // API key invalid
      }

      return response.ok || response.status === 400;
    } catch (err) {
      // Network error, endpoint unreachable
      return false;
    }
  }

  /**
   * Supported MIME types for Gemini Vision.
   * Comprehensive list of image formats supported by Gemini.
   */
  async supportedMimeTypes(): Promise<string[]> {
    return [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/tiff',
      'image/bmp',
      'image/x-windows-bmp',
    ];
  }

  /**
   * Extract image metadata via Gemini Vision API.
   *
   * Flow:
   * 1. Read image file as base64
   * 2. Build API request with vision instructions
   * 3. Retry on transient failures
   * 4. Parse response and extract metadata
   * 5. Count tokens for cost tracking
   * 6. Return normalized AnalyzerResult
   *
   * Vision instructions ask for:
   * - Scene graph (objects, relationships, spatial info)
   * - Face detection (count, approximate locations, expressions)
   * - Text extraction (OCR)
   * - Quality/confidence metrics
   */
  async extract(file: FileRecord): Promise<RemoteExtractResult> {
    // Read image file as base64
    let imageBase64: string;
    try {
      const buffer = await fs.readFile(file.path);
      imageBase64 = buffer.toString('base64');
    } catch (err) {
      throw new Error(`[RemoteImageExtractor] Failed to read image file ${file.path}: ${err}`);
    }

    // Determine media type from MIME type
    const mediaType = file.mimeType;

    // Retry wrapper
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await this.extractWithRetry(imageBase64, mediaType);
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        // Check if error is retryable
        if (!this.isRetryableError(lastError) || attempt === this.retryConfig.maxRetries) {
          throw lastError;
        }

        // Exponential backoff before retry
        const delayMs = Math.min(
          this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt),
          this.retryConfig.maxDelayMs
        );

        await this.sleep(delayMs);
      }
    }

    throw lastError ?? new Error('[RemoteImageExtractor] Unknown error during extraction');
  }

  /**
   * Core API call (wrapped by retry logic).
   */
  private async extractWithRetry(
    imageBase64: string,
    mediaType: string
  ): Promise<RemoteExtractResult> {
    const visionPrompt = `
Analyze this image and provide:

1. **Scene Graph**: List all objects visible, their attributes, and relationships.
   Format as JSON: { objects: [{name, color, size, position}], relationships: [{subject, predicate, object}] }

2. **Face Detection**: Count faces and describe approximate positions.
   Format as JSON: { faceCount: number, faces: [{x, y, confidence}] }

3. **Text Extraction**: Any visible text in the image (OCR).
   Format as JSON: { textBlocks: [{text, position, confidence}] }

4. **Quality Score**: Overall image quality and how confident you are in these detections (0-100).
   Format as JSON: { qualityScore: number, confidence: number }

Return ONLY valid JSON (no markdown, no explanation).
`;

    const response = await fetch(
      `${this.endpoint}/${this.modelId}:generateContent?key=${encodeURIComponent(this.apiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: mediaType,
                    data: imageBase64,
                  },
                },
                {
                  text: visionPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 1_024,
            temperature: 0.2, // Low temperature for deterministic output
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `[RemoteImageExtractor] API error ${response.status}: ${errorText}`
      );
    }

    const apiResponse = (await response.json()) as GeminiVisionResponse;

    // Extract text response
    let extractedText = '';
    if (apiResponse.candidates?.[0]?.content?.parts?.[0]?.text) {
      extractedText = apiResponse.candidates[0].content.parts[0].text;
    }

    // Parse JSON response
    let parsedData: any;
    try {
      parsedData = JSON.parse(extractedText);
    } catch (err) {
      // If JSON parsing fails, return raw text wrapped in object
      parsedData = {
        rawText: extractedText,
        parseError: `Failed to parse JSON: ${err}`,
      };
    }

    // Extract token usage
    const tokenUsage = apiResponse.usageMetadata?.totalTokenCount ?? 0;

    // Compute confidence from parsed data
    const confidence =
      (parsedData?.qualityScore ?? 75) / 100; // Normalize 0-100 to 0-1

    return {
      modelName: 'gemini-vision',
      modelVersion: this.modelVersion,
      tokenUsage,
      confidence: Math.max(0, Math.min(1, confidence)), // Clamp to [0, 1]
      data: parsedData,
      errors: [],
    };
  }

  /**
   * Determine if an error is retryable (transient vs. permanent).
   *
   * Retryable:
   * - 429 (rate limit)
   * - 500, 502, 503, 504 (server errors)
   * - Network timeouts
   *
   * Not retryable:
   * - 401 (auth)
   * - 403 (forbidden)
   * - 400 (bad request)
   */
  private isRetryableError(err: Error): boolean {
    const message = err.message;

    // Retryable HTTP status codes
    if (message.includes('429') || message.includes('rate limit')) return true;
    if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
      return true;
    }

    // Network errors
    if (message.includes('timeout') || message.includes('ECONNREFUSED')) return true;
    if (message.includes('ENOTFOUND') || message.includes('socket hang up')) return true;

    // Non-retryable
    if (message.includes('401') || message.includes('403') || message.includes('400')) {
      return false;
    }

    // Default: not retryable (be conservative)
    return false;
  }

  /**
   * Simple sleep utility for retry backoff.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Token counter utility.
 * Rough estimate for Gemini: ~4 chars per token (adjust based on actual usage).
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Cost calculator.
 * Gemini 1.5 Flash pricing (as of 2026-06):
 * - Input: $0.075 per 1M tokens
 * - Output: $0.30 per 1M tokens
 *
 * [UPDATE] if pricing changes.
 */
export function estimateCostUSD(inputTokens: number, outputTokens: number): number {
  const INPUT_COST_PER_M_TOKENS = 0.075;
  const OUTPUT_COST_PER_M_TOKENS = 0.30;

  const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_M_TOKENS;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_M_TOKENS;

  return inputCost + outputCost;
}
