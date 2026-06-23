/**
 * FileExecutionStore — JSON-backed execution persistence
 *
 * Stores executions on disk as JSON files. Suitable for:
 * - Local development
 * - Single-region deployment
 * - Disaster recovery (snapshots to S3)
 *
 * For multi-region, use RedisExecutionStore (Phase E.5).
 */
import * as fs from "fs/promises";
import * as path from "path";
export class FileExecutionStore {
    constructor(config) {
        this.basePath = config.basePath || process.env.EXECUTION_STORE_PATH || "./executions";
        this.retentionDays = config.retentionDays || 30;
        // Ensure base directory exists
        this.ensureDirectoryExists();
    }
    async ensureDirectoryExists() {
        try {
            await fs.mkdir(this.basePath, { recursive: true });
        }
        catch (err) {
            console.error(`Failed to create execution store directory: ${this.basePath}`, err);
            throw err;
        }
    }
    getExecutionPath(executionId) {
        return path.join(this.basePath, `${executionId}.json`);
    }
    async save(execution, options) {
        try {
            const filePath = this.getExecutionPath(execution.id);
            await fs.writeFile(filePath, JSON.stringify(execution, null, 2), "utf-8");
        }
        catch (err) {
            throw new Error(`Failed to save execution ${execution.id}: ${err.message}`);
        }
    }
    async update(executionId, updates, options) {
        try {
            const execution = await this.get(executionId);
            if (!execution) {
                throw new Error(`Execution not found: ${executionId}`);
            }
            const updated = { ...execution, ...updates };
            await this.save(updated, options);
        }
        catch (err) {
            throw new Error(`Failed to update execution ${executionId}: ${err.message}`);
        }
    }
    async get(executionId) {
        try {
            const filePath = this.getExecutionPath(executionId);
            const content = await fs.readFile(filePath, "utf-8");
            return JSON.parse(content);
        }
        catch (err) {
            if (err.code === "ENOENT") {
                return null;
            }
            throw new Error(`Failed to read execution ${executionId}: ${err.message}`);
        }
    }
    async list(filter) {
        try {
            const files = await fs.readdir(this.basePath);
            const jsonFiles = files.filter((f) => f.endsWith(".json"));
            let executions = [];
            for (const file of jsonFiles) {
                const filePath = path.join(this.basePath, file);
                const content = await fs.readFile(filePath, "utf-8");
                executions.push(JSON.parse(content));
            }
            // Apply filters
            if (filter?.template_id) {
                executions = executions.filter((e) => e.template_id === filter.template_id);
            }
            if (filter?.status) {
                executions = executions.filter((e) => e.status === filter.status);
            }
            if (filter?.region) {
                executions = executions.filter((e) => e.region === filter.region);
            }
            // Apply pagination
            const offset = filter?.offset || 0;
            const limit = filter?.limit || 1000;
            executions = executions.slice(offset, offset + limit);
            return executions;
        }
        catch (err) {
            throw new Error(`Failed to list executions: ${err.message}`);
        }
    }
    async delete(executionId) {
        try {
            const filePath = this.getExecutionPath(executionId);
            await fs.unlink(filePath);
        }
        catch (err) {
            if (err.code === "ENOENT") {
                return; // Already deleted
            }
            throw new Error(`Failed to delete execution ${executionId}`);
        }
    }
    async archive(olderThanDays) {
        try {
            const files = await fs.readdir(this.basePath);
            const jsonFiles = files.filter((f) => f.endsWith(".json"));
            const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
            let archived = 0;
            for (const file of jsonFiles) {
                const filePath = path.join(this.basePath, file);
                const content = await fs.readFile(filePath, "utf-8");
                const execution = JSON.parse(content);
                const createdAt = new Date(execution.created_at).getTime();
                if (createdAt < cutoff) {
                    // Move to archive subdirectory
                    const archiveDir = path.join(this.basePath, "archived");
                    await fs.mkdir(archiveDir, { recursive: true });
                    const archivePath = path.join(archiveDir, file);
                    await fs.rename(filePath, archivePath);
                    archived++;
                }
            }
            return archived;
        }
        catch (err) {
            throw new Error(`Failed to archive executions: ${err.message}`);
        }
    }
    async addSpan(executionId, span) {
        try {
            const execution = await this.get(executionId);
            if (!execution) {
                throw new Error(`Execution not found: ${executionId}`);
            }
            execution.spans.push(span);
            await this.save(execution);
        }
        catch (err) {
            throw new Error(`Failed to add span to execution ${executionId}: ${err.message}`);
        }
    }
    async updateSpan(executionId, spanId, updates) {
        try {
            const execution = await this.get(executionId);
            if (!execution) {
                throw new Error(`Execution not found: ${executionId}`);
            }
            const spanIdx = execution.spans.findIndex((s) => s.id === spanId);
            if (spanIdx === -1) {
                throw new Error(`Span not found: ${spanId} in execution ${executionId}`);
            }
            execution.spans[spanIdx] = { ...execution.spans[spanIdx], ...updates };
            await this.save(execution);
        }
        catch (err) {
            throw new Error(`Failed to update span ${spanId} in execution ${executionId}: ${err.message}`);
        }
    }
}
//# sourceMappingURL=FileExecutionStore.js.map