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
import { IExecutionStore, FlowExecution, FlowSpan, ExecutionStoreOptions } from "./IExecutionStore.js";
export interface FileExecutionStoreConfig {
    basePath: string;
    retentionDays?: number;
}
export declare class FileExecutionStore implements IExecutionStore {
    private basePath;
    private retentionDays;
    constructor(config: FileExecutionStoreConfig);
    private ensureDirectoryExists;
    private getExecutionPath;
    save(execution: FlowExecution, options?: ExecutionStoreOptions): Promise<void>;
    update(executionId: string, updates: Partial<FlowExecution>, options?: ExecutionStoreOptions): Promise<void>;
    get(executionId: string): Promise<FlowExecution | null>;
    list(filter?: {
        template_id?: string;
        status?: string;
        region?: string;
        limit?: number;
        offset?: number;
    }): Promise<FlowExecution[]>;
    delete(executionId: string): Promise<void>;
    archive(olderThanDays: number): Promise<number>;
    addSpan(executionId: string, span: FlowSpan): Promise<void>;
    updateSpan(executionId: string, spanId: string, updates: Partial<FlowSpan>): Promise<void>;
}
