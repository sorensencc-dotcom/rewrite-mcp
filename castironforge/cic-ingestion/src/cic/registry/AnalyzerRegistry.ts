/**
 * AnalyzerRegistry
 * Central registry for all CIC analyzers
 */

import type { Analyzer, AnalyzerRegistry } from '../types/analyzer.js';

class CICAnalyzerRegistry implements AnalyzerRegistry {
  private analyzers: Map<string, Analyzer> = new Map();

  register(id: string, analyzer: Analyzer): void {
    if (this.analyzers.has(id)) {
      console.warn(`[AnalyzerRegistry] Overwriting analyzer ${id}`);
    }
    this.analyzers.set(id, analyzer);
  }

  get(id: string): Analyzer | undefined {
    return this.analyzers.get(id);
  }

  list(): Analyzer[] {
    return Array.from(this.analyzers.values());
  }

  has(id: string): boolean {
    return this.analyzers.has(id);
  }
}

export const analyzerRegistry = new CICAnalyzerRegistry();
