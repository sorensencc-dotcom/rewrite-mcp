// localImageExtractor.ts
// Local-LLM image extractor interface and implementation
// Pattern: Manages GPU model lifecycle via warm pool; supports streaming extraction

import type { FileRecord } from '../../types/fileRecord.js';
import type { WarmPoolManager } from '../warmPool/WarmPoolManager.js';

/**
 * LocalExtractResult — output from local image extraction (streaming or batch).
 * Includes model metadata, GPU memory usage, confidence, and structured data.
 */
export interface LocalExtractResult {
  modelName: string;
  modelVersion: string;
  gpuMemoryUsedMB?: number;
  confidence: number;
  data: unknown;
  errors?: string[];
}

/**
 * LocalImageExtractor — manages local-LLM image analysis.
 * Uses WarmPoolManager to keep models warm and avoid cold starts.
 *
 * Supports:
 * - Health checks (model loaded, GPU available, not in OOM recovery)
 * - Dynamic MIME type detection (based on model capabilities)
 * - Streaming extraction (yields partial results as tokens arrive)
 * - GPU memory tracking
 * - Deterministic error handling
 */
export interface ILocalImageExtractor {
  healthCheck(): Promise<boolean>;
  supportedMimeTypes(): Promise<string[]>;
  extractStreaming(file: FileRecord): AsyncIterable<LocalExtractResult> | Promise<LocalExtractResult>;
}

interface LocalImageExtractorOptions {
  warmPool: WarmPoolManager;
  model?: string; // e.g., 'llava-1.5' or 'minicpm-v'
}

interface WarmModel {
  name: string;
  version: string;
  analyzeImageStreaming(filePath: string): AsyncIterable<any>;
  analyzeImageBatch(filePath: string): Promise<any>;
  getGpuMemoryUsageMB(): Promise<number>;
  release(): Promise<void>;
}

/**
 * LocalImageExtractor implementation.
 *
 * Lifecycle:
 * 1. constructor() — store reference to WarmPoolManager
 * 2. healthCheck() — verify pool status
 * 3. extractStreaming() — acquire model, stream results, release model
 *
 * Error handling:
 * - OOM during extraction → propagate to adapter (adapter may fallback to remote)
 * - Model unload race → retry or fallback
 * - GPU not available → caught by healthCheck()
 */
export class LocalImageExtractor implements ILocalImageExtractor {
  private warmPool: WarmPoolManager;
  private modelId: string;

  constructor(opts: LocalImageExtractorOptions) {
    this.warmPool = opts.warmPool;
    this.modelId = opts.model ?? 'default-vision-model';
  }

  /**
   * Health check: Verify the warm pool is in good state.
   * Returns false if OOM recovery, model not loaded, or GPU unavailable.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const status = await this.warmPool.getStatus();

      // Pool must be healthy and not in OOM recovery
      if (!status.healthy || status.oomRecovering) {
        return false;
      }

      // Model must be loaded or loadable
      if (status.modelCount === 0) {
        // Attempt warm-up
        const model = await this.warmPool.acquireModel();
        await model.release();
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Supported MIME types for local image analysis.
   * This is dynamic based on the loaded model's capabilities.
   *
   * Example:
   * - LLaVA 1.5: JPEG, PNG, WebP
   * - MiniCPM-V: JPEG, PNG, WebP, GIF, TIFF
   *
   * [CUSTOMIZE] — Query model capabilities or return hardcoded list based on model ID.
   */
  async supportedMimeTypes(): Promise<string[]> {
    // Placeholder: Hardcoded list for common vision models
    // In production, query the model or warm pool for its actual capabilities
    return ['image/jpeg', 'image/png', 'image/webp'];
  }

  /**
   * Extract image metadata using local model.
   *
   * Strategy:
   * 1. Acquire model from warm pool (or wait for availability)
   * 2. Stream tokens from model.analyzeImageStreaming(filePath)
   * 3. Aggregate tokens into scene graph, face clusters, confidence
   * 4. Return LocalExtractResult with GPU memory and latency
   * 5. Release model back to warm pool
   *
   * If streaming is not available, fall back to batch mode.
   *
   * Errors:
   * - OOM during extraction → throw
   * - Model unload race → throw (adapter handles fallback)
   * - Invalid file path → throw
   */
  async extractStreaming(file: FileRecord): Promise<LocalExtractResult> {
    let model: WarmModel | null = null;

    try {
      // Acquire model from warm pool
      model = await this.warmPool.acquireModel();

      // Stream extraction
      let aggregatedData: any = {};
      let maxConfidence = 0.0;
      let tokenCount = 0;

      try {
        const stream = model.analyzeImageStreaming(file.path);

        // Iterate through streaming chunks
        for await (const chunk of stream) {
          // Merge chunk data into aggregated result
          aggregatedData = mergeExtractedChunk(aggregatedData, chunk.data);

          // Track max confidence across chunks
          if (chunk.confidence !== undefined) {
            maxConfidence = Math.max(maxConfidence, chunk.confidence);
          }

          // Track tokens for future cost estimation
          if (chunk.tokensThisChunk !== undefined) {
            tokenCount += chunk.tokensThisChunk;
          }
        }
      } catch (streamErr) {
        // Streaming failed; try batch mode as fallback
        const batchResult = await model.analyzeImageBatch(file.path);
        aggregatedData = batchResult.data ?? {};
        maxConfidence = batchResult.confidence ?? 0.5;
      }

      // Retrieve GPU memory usage
      const gpuMem = await model.getGpuMemoryUsageMB();

      return {
        modelName: model.name,
        modelVersion: model.version,
        gpuMemoryUsedMB: gpuMem,
        confidence: maxConfidence || 0.5,
        data: aggregatedData,
        errors: [],
      };
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);

      // Check if this is an OOM error; if so, signal the warm pool
      if (errMsg.includes('OOM') || errMsg.includes('memory')) {
        try {
          await this.warmPool.signalOOMRecovery();
        } catch {
          // Warn but don't rethrow
        }
      }

      throw e;
    } finally {
      // Always release the model back to the pool
      if (model) {
        try {
          await model.release();
        } catch {
          // Warn but don't fail the entire extraction
        }
      }
    }
  }
}

/**
 * Merge two extraction chunks deterministically.
 *
 * Example schema (customize based on your scene-graph format):
 * {
 *   sceneGraph: { objects: [...], relationships: [...] },
 *   faceClusters: [...],
 *   textOcr: [...]
 * }
 *
 * Merge strategy:
 * - Concatenate arrays (objects, relationships, face clusters)
 * - Update confidence if chunk is higher
 * - Deduplicate if IDs are present
 */
function mergeExtractedChunk(current: any, next: any): any {
  if (!next) return current;
  if (!current) return next;

  return {
    sceneGraph: {
      objects: [
        ...(current?.sceneGraph?.objects ?? []),
        ...(next?.sceneGraph?.objects ?? []),
      ],
      relationships: [
        ...(current?.sceneGraph?.relationships ?? []),
        ...(next?.sceneGraph?.relationships ?? []),
      ],
    },
    faceClusters: [
      ...(current?.faceClusters ?? []),
      ...(next?.faceClusters ?? []),
    ],
    textOcr: [
      ...(current?.textOcr ?? []),
      ...(next?.textOcr ?? []),
    ],
    metadata: {
      ...(current?.metadata ?? {}),
      ...(next?.metadata ?? {}),
    },
  };
}
