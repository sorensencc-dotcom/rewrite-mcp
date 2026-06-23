// analyzerRegistry.ts — CIC Dashboard integration for analyzers
// Registers analyzer health status and metrics for operator console

import type { Analyzer } from '../types/analyzer.js';

export interface AnalyzerDashboardStatus {
  id: string;
  version: string;
  healthy: boolean;
  backend: 'local' | 'remote' | 'hybrid';
  warmPoolHealthy?: boolean;
  lastCheck: string;
  metrics?: {
    latencyMs?: number;
    successRate?: number;
    gpuMemoryUsedMB?: number;
  };
}

export class AnalyzerRegistry {
  private analyzers: Map<string, Analyzer> = new Map();
  private status: Map<string, AnalyzerDashboardStatus> = new Map();

  register(analyzer: Analyzer) {
    this.analyzers.set(analyzer.id, analyzer);
  }

  async updateStatus(analyzerId: string): Promise<AnalyzerDashboardStatus | null> {
    const analyzer = this.analyzers.get(analyzerId);
    if (!analyzer) return null;

    try {
      await analyzer.healthCheck();

      const status: AnalyzerDashboardStatus = {
        id: analyzer.id,
        version: analyzer.version,
        healthy: true,
        backend: 'hybrid',
        lastCheck: new Date().toISOString(),
      };

      this.status.set(analyzerId, status);
      return status;
    } catch (e) {
      const status: AnalyzerDashboardStatus = {
        id: analyzer.id,
        version: analyzer.version,
        healthy: false,
        backend: 'remote',
        lastCheck: new Date().toISOString(),
      };

      this.status.set(analyzerId, status);
      return status;
    }
  }

  getStatus(analyzerId: string): AnalyzerDashboardStatus | undefined {
    return this.status.get(analyzerId);
  }

  getAllStatus(): AnalyzerDashboardStatus[] {
    return Array.from(this.status.values());
  }
}

export const analyzerRegistry = new AnalyzerRegistry();
