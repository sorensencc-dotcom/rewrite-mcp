/**
 * WaylandFileAdapter — Map Wayland file tool → CIC file operations
 * Enforces root boundaries, read-only constraints, logging to MLA
 */

const { readFileSync, writeFileSync, readdirSync, statSync } = require('fs');
const { resolve } = require('path');

class WaylandFileAdapter {
  constructor() {
    this.allowedRoots = ['./docs', './logs', './cic'];
    this.readOnlyRoots = ['./vendor'];
  }

  /**
   * Read file with boundary enforcement
   */
  async read(path) {
    const resolved = resolve(path);
    this.validatePath(resolved, 'read');

    try {
      console.log(`[FileAdapter] Reading: ${path}`);
      const content = readFileSync(resolved, 'utf-8');

      const result = {
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
  async write(path, content) {
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
  async list(path) {
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
  validatePath(resolved, action) {
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
  logToPipeline(eventType, detail) {
    console.log(`[FileAdapter] → MLA event: ${eventType}`, detail);
  }
}

module.exports = { WaylandFileAdapter };
