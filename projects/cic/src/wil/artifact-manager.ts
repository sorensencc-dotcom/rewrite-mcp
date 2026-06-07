/**
 * Artifact Integration & Management (Phase 46.5)
 *
 * Write CIC artifacts to Wayland-visible paths.
 * Enforce 25 MB artifact size limit.
 * Expose metadata via REST endpoints.
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const ARTIFACT_SIZE_LIMIT_MB = 25;
const ARTIFACT_SIZE_LIMIT_BYTES = ARTIFACT_SIZE_LIMIT_MB * 1024 * 1024;

export interface ArtifactMetadata {
  id: string;
  task_id: string;
  name: string;
  path: string;
  size_bytes: number;
  size_mb: number;
  created_at: string;
  mime_type: string;
  checksum?: string;
  tags?: string[];
  session_color?: string;
  session_icon?: string;
  session_brand?: string;
}

export class ArtifactManager {
  private baseDir: string;
  private artifacts: Map<string, Map<string, ArtifactMetadata>> = new Map();

  constructor(baseDir: string = process.env.CIC_WORKSPACE || '/cic_workspace') {
    this.baseDir = path.join(baseDir, 'artifacts');
    this.ensureBaseDir();
  }

  private ensureBaseDir(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private validateSize(sizeBytes: number): boolean {
    return sizeBytes > 0 && sizeBytes <= ARTIFACT_SIZE_LIMIT_BYTES;
  }

  private calculateChecksum(content: string | Buffer): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(content);
    return hash.digest('hex').substring(0, 16);
  }

  async writeArtifact(
    taskId: string,
    name: string,
    content: string | Buffer,
    mimeType: string = 'application/octet-stream',
    tags?: string[]
  ): Promise<ArtifactMetadata | null> {
    // Validate size
    const contentBuffer = typeof content === 'string' ? Buffer.from(content) : content;
    const sizeBytes = contentBuffer.length;

    if (!this.validateSize(sizeBytes)) {
      console.log(JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        event: 'artifact_size_limit_exceeded',
        taskId,
        size_bytes: sizeBytes,
        limit_bytes: ARTIFACT_SIZE_LIMIT_BYTES
      }));
      return null;
    }

    // Create task-specific directory
    const taskDir = path.join(this.baseDir, taskId);
    if (!fs.existsSync(taskDir)) {
      fs.mkdirSync(taskDir, { recursive: true });
    }

    // Generate artifact ID and path
    const artifactId = uuidv4();
    const filePath = path.join(taskDir, `${artifactId}-${name}`);

    // Write file
    fs.writeFileSync(filePath, contentBuffer);

    // Create metadata
    const metadata: ArtifactMetadata = {
      id: artifactId,
      task_id: taskId,
      name,
      path: filePath,
      size_bytes: sizeBytes,
      size_mb: parseFloat((sizeBytes / (1024 * 1024)).toFixed(2)),
      created_at: new Date().toISOString(),
      mime_type: mimeType,
      checksum: this.calculateChecksum(contentBuffer),
      tags
    };

    // Store metadata
    if (!this.artifacts.has(taskId)) {
      this.artifacts.set(taskId, new Map());
    }
    this.artifacts.get(taskId)!.set(artifactId, metadata);

    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      event: 'artifact_written',
      taskId,
      artifactId,
      size_mb: metadata.size_mb,
      mime_type: mimeType
    }));

    return metadata;
  }

  getArtifact(taskId: string, artifactId: string): ArtifactMetadata | undefined {
    return this.artifacts.get(taskId)?.get(artifactId);
  }

  getArtifactContent(taskId: string, artifactId: string): Buffer | null {
    const metadata = this.getArtifact(taskId, artifactId);
    if (!metadata || !fs.existsSync(metadata.path)) {
      return null;
    }
    return fs.readFileSync(metadata.path);
  }

  listArtifacts(taskId: string): ArtifactMetadata[] {
    return Array.from(this.artifacts.get(taskId)?.values() || []);
  }

  deleteArtifact(taskId: string, artifactId: string): boolean {
    const metadata = this.getArtifact(taskId, artifactId);
    if (!metadata) {
      return false;
    }

    try {
      if (fs.existsSync(metadata.path)) {
        fs.unlinkSync(metadata.path);
      }
      this.artifacts.get(taskId)?.delete(artifactId);
      return true;
    } catch (error) {
      console.log(JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        event: 'artifact_deletion_failed',
        taskId,
        artifactId,
        error: error instanceof Error ? error.message : String(error)
      }));
      return false;
    }
  }

  updateMetadata(taskId: string, artifactId: string, updates: Partial<ArtifactMetadata>): ArtifactMetadata | undefined {
    const metadata = this.getArtifact(taskId, artifactId);
    if (!metadata) {
      return undefined;
    }

    const updated = { ...metadata, ...updates, id: metadata.id, task_id: metadata.task_id };
    this.artifacts.get(taskId)?.set(artifactId, updated);
    return updated;
  }

  getTaskStats(taskId: string): Record<string, unknown> {
    const artifacts = this.listArtifacts(taskId);
    const totalSize = artifacts.reduce((sum, a) => sum + a.size_bytes, 0);
    const totalSizeMb = parseFloat((totalSize / (1024 * 1024)).toFixed(2));

    return {
      task_id: taskId,
      artifact_count: artifacts.length,
      total_size_bytes: totalSize,
      total_size_mb: totalSizeMb,
      artifacts: artifacts.map((a) => ({
        id: a.id,
        name: a.name,
        size_mb: a.size_mb,
        created_at: a.created_at,
        mime_type: a.mime_type,
        tags: a.tags
      }))
    };
  }

  cleanup(taskId: string): void {
    const taskDir = path.join(this.baseDir, taskId);
    if (fs.existsSync(taskDir)) {
      fs.rmSync(taskDir, { recursive: true, force: true });
    }
    this.artifacts.delete(taskId);
  }
}

export default ArtifactManager;
