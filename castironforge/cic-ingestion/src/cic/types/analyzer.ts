/**
 * Analyzer types
 * Interfaces for all CIC analyzers
 */

import type { FileRecord } from './fileRecord.js';

export interface AnalyzerResult {
  analyzerId: string;
  analyzerVersion: string;
  fileId: string;
  extractedAt: string;
  backend: 'local' | 'remote' | 'hybrid';
  modelName: string;
  modelVersion: string;
  latencyMs: number;
  confidence: number;
  data: unknown;
  gpuMemoryUsedMB?: number;
  tokenUsage?: number;
  errors?: string[];
}

export interface Analyzer {
  id: string;
  version: string;
  analyze(file: FileRecord, sidecar?: unknown): Promise<AnalyzerResult>;
  healthCheck?(): Promise<boolean>;
}

export interface AnalyzerRegistry {
  register(id: string, analyzer: Analyzer): void;
  get(id: string): Analyzer | undefined;
  list(): Analyzer[];
}
