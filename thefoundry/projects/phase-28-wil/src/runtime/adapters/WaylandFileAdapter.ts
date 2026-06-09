/**
 * WaylandFileAdapter — Map Wayland file tool → CIC file operations
 * Enforces root boundaries, read-only constraints, logging to MLA
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve } from 'path';

export interface FileEntry {
  name: string;
  isDir: boolean;
  size: number;
}

export interface FileContent {
  path: string;
  content: string;
  size: number;
}

export class WaylandFileAdapter {
  private allowedRoots = ['./docs', './logs', './cic'];
  private readOnlyRoots = ['./vendor'];

  /**
   * Read file with boundary enforcement
   */
  async read(path: string): Promise<FileContent> {
    const resolved = resolve(path);
    this.validatePath(resolved, 'read');

    try {
      console.log(`[FileAdapter] Reading: ${path}`);
      const content = readFileSync(resolved, 'utf-8');

      const result: FileContent = {
        path,
        content,
        size: Buffer.byteLength(content, 'utf-8'),
      };

      console.log(`[FileAdapter] Read ${result.size} bytes from ${path}`);
      this.logToPipeline('PIPELINE_RUN', { action: 'read', path, size: result.size });

      return result;
    } catch (err) {
      console.error(`[FileAdapter] Read failed: ${path}`, err);
      this.logToPipeline('AGENT_TELEMETRY', { action: 'read', path, error: String(err) });
      throw err;
    }
  }

  /**
   * Write file with boundary enforcement
   */
  async write(path: string, content: string): Promise<void> {
    const resolved = resolve(path);
    this.validatePath(resolved, 'write');

    try {
      console.log(`[FileAdapter] Writing: ${path}`);
      writeFileSync(resolved, content, 'utf-8');

      const size = Buffer.byteLength(content, 'utf-8');
      console.log(`[FileAdapter] Wrote ${size} bytes to ${path}`);
      this.logToPipeline('GOVERNANCE_SIGNAL', { action: 'write', path, size });
    } catch (err) {
      console.error(`[FileAdapter] Write failed: ${path}`, err);
      this.logToPipeline('AGENT_TELEMETRY', { action: 'write', path, error: String(err) });
      throw err;
    }
  }

  /**
   * List directory with boundary enforcement
   */
  async list(path: string): Promise<FileEntry[]> {
    const resolved = resolve(path);
    this.validatePath(resolved, 'read');

    try {
      console.log(`[FileAdapter] Listing: ${path}`);
      const entries = readdirSync(resolved);

      const result = entries.map((name) => {
        const fullPath = resolve(resolved, name);
        const stat = statSync(fullPath);
        return {
          name,
          isDir: stat.isDirectory(),
          size: stat.size,
        };
      });

      console.log(`[FileAdapter] Listed ${result.length} entries in ${path}`);
      this.logToPipeline('PIPELINE_RUN', { action: 'list', path, count: result.length });

      return result;
    } catch (err) {
      console.error(`[FileAdapter] List failed: ${path}`, err);
      this.logToPipeline('AGENT_TELEMETRY', { action: 'list', path, error: String(err) });
      throw err;
    }
  }

  /**
   * Validate path against boundaries
   */
  private validatePath(resolved: string, action: string): void {
    // Check allowlist
    const isAllowed = this.allowedRoots.some((root) =>
      resolved.startsWith(resolve(root))
    );

    if (!isAllowed) {
      throw new Error(
        `[FileAdapter] Path not in allowed roots (${action}): ${resolved}`
      );
    }

    // Check write constraints
    if (action === 'write') {
      const isReadOnly = this.readOnlyRoots.some((root) =>
        resolved.startsWith(resolve(root))
      );
      if (isReadOnly) {
        throw new Error(
          `[FileAdapter] Path is read-only: ${resolved}`
        );
      }
    }
  }

  /**
   * Log operations to MLA (stub for Phase 28.4)
   */
  private logToPipeline(eventType: string, detail: Record<string, unknown>): void {
    console.log(`[FileAdapter] → MLA event: ${eventType}`, detail);
  }
}
