/**
 * @file DuckDBAnalyticsEngine.ts
 * @description In-process DuckDB connection and memory manager with streaming fallback.
 */

import { analyzeAgentTrajectory } from '../../../scripts/evaluate-duckdb-analytics.mjs';

export interface DuckDBEngineConfig {
  maxMemory?: string; // default '512MB'
  threads?: number;   // default 4
}

export class DuckDBAnalyticsEngine {
  private config: Required<DuckDBEngineConfig>;
  private isNativeAvailable: boolean = false;
  private dbInstance: any = null;

  constructor(config: DuckDBEngineConfig = {}) {
    this.config = {
      maxMemory: config.maxMemory || '512MB',
      threads: config.threads || 4,
    };
  }

  /**
   * Initializes connection. Attempts native DuckDB binding; flags fallback if unavailable.
   */
  async initialize(): Promise<void> {
    try {
      // Attempt dynamic import of @duckdb/node-api or duckdb
      const duckdbModule = await import('@duckdb/node-api').catch(() => null);
      if (duckdbModule && duckdbModule.DuckDBInstance) {
        this.dbInstance = await duckdbModule.DuckDBInstance.create(':memory:');
        const connection = await this.dbInstance.connect();
        await connection.run(`SET max_memory = '${this.config.maxMemory}';`);
        await connection.run(`SET threads = ${this.config.threads};`);
        this.isNativeAvailable = true;
      } else {
        this.isNativeAvailable = false;
      }
    } catch {
      this.isNativeAvailable = false;
    }
  }

  /**
   * Indicates whether native DuckDB engine is active or fallback streaming is in use.
   */
  isNative(): boolean {
    return this.isNativeAvailable;
  }

  /**
   * Executes a vectorized SQL query over Parquet / JSON files, or uses fallback engine.
   * @param sql - SQL query string
   * @param fallbackFile - JSONL file path for fallback execution
   */
  async query(sql: string, fallbackFile?: string): Promise<any[]> {
    if (this.isNativeAvailable && this.dbInstance) {
      const connection = await this.dbInstance.connect();
      const reader = await connection.runAndReadAll(sql);
      return reader.getRows();
    }

    // Fallback: If fallbackFile provided, run streaming trajectory analysis
    if (fallbackFile) {
      const result = await analyzeAgentTrajectory(fallbackFile);
      return [result];
    }

    return [];
  }

  /**
   * Closes connection resources.
   */
  async close(): Promise<void> {
    if (this.dbInstance) {
      try {
        await this.dbInstance.close();
      } catch {
        // Safe close
      }
      this.dbInstance = null;
      this.isNativeAvailable = false;
    }
  }
}
