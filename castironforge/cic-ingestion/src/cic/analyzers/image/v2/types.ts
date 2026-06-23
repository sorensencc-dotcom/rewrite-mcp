// types.ts
// Core types for CIC analyzers: Analyzer, AnalyzerResult, FileRecord, Sidecar
// Used by imageAnalyzerV2 and all other CIC analyzer implementations

/**
 * FileRecord — Metadata about a file being analyzed.
 * Includes MIME type, size, path for local access, and optional metadata.
 */
export interface FileRecord {
  id: string; // Unique file ID in CIC system
  path: string; // Absolute file path (local or remote)
  mimeType: string; // MIME type (e.g., 'image/jpeg')
  sizeBytes?: number; // File size in bytes (used for routing decisions)
  name?: string; // Original filename
  metadata?: Record<string, unknown>; // Additional metadata (encoding, camera, etc.)
}

/**
 * Sidecar — Optional context about a file (extracted metadata, prior results, etc.).
 * Used by analyzers to correlate results with prior processing steps.
 */
export interface Sidecar {
  fileId: string;
  priorAnalyzers?: string[]; // IDs of analyzers that already processed this file
  metadata?: Record<string, unknown>;
}

/**
 * AnalyzerResult — Deterministic output from any CIC analyzer.
 * All fields are backend-independent; backend-specific fields are optional.
 *
 * Fields:
 * - analyzerId, analyzerVersion: Identify the analyzer and its version
 * - fileId, extractedAt: Link result to input file and extraction time
 * - backend, modelName, modelVersion: Identify which backend/model was used
 * - latencyMs: Wall-clock time for extraction (for performance monitoring)
 * - gpuMemoryUsedMB, tokenUsage: Backend-specific resource usage
 *   - Local: gpuMemoryUsedMB is set; tokenUsage is null
 *   - Remote: tokenUsage is set; gpuMemoryUsedMB is null
 *   - Hybrid: Both may be set (whichever succeeded)
 * - confidence: Confidence in the analysis (0.0 to 1.0)
 *   - Normalized across backends (may be calibrated per-backend)
 * - data: The actual extracted metadata (scene graph, face clusters, text, etc.)
 *   - Schema is analyzer-specific; defined in analyzer documentation
 * - errors: Array of non-fatal error messages encountered during extraction
 */
export interface AnalyzerResult {
  analyzerId: string;
  analyzerVersion: string;

  fileId: string;
  extractedAt: string; // ISO 8601 timestamp

  backend: 'local' | 'remote' | 'hybrid';
  modelName: string;
  modelVersion: string;

  latencyMs: number;

  gpuMemoryUsedMB: number | null;
  tokenUsage: number | null;

  confidence: number; // 0.0 to 1.0

  data: unknown; // Analyzer-specific output (scene graph, etc.)

  errors: string[]; // Non-fatal errors during extraction
}

/**
 * Analyzer — The interface that all CIC analyzers must implement.
 * Registered in the CICAnalyzer registry and invoked by the pipeline.
 */
export interface Analyzer {
  id: string; // Unique analyzer ID (e.g., 'image_analyzer_v2')
  version: string; // Semantic version
  healthCheck(): Promise<void>; // Throws if analyzer is unhealthy
  analyze(file: FileRecord, sidecar?: Sidecar): Promise<AnalyzerResult>;
}

/**
 * AnalyzerRegistry — Discovers and invokes analyzers by ID.
 * [ADJUST TO MATCH ACTUAL CIC REGISTRY INTERFACE]
 */
export interface AnalyzerRegistry {
  register(id: string, analyzer: Analyzer): void;
  get(id: string): Analyzer | undefined;
  list(): Analyzer[];
}
