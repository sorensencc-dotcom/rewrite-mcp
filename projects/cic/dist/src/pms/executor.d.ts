/**
 * src/pms/executor.ts
 * Template Executor — v1.0.0
 * Date: 2026-05-29
 */
import { PMSExecutionRequest } from "./types";
import { TemplateRegistry } from "./registry";
export declare class PMSExecutor {
    private registry;
    constructor(registry?: TemplateRegistry);
    initialize(): void;
    execute(reqOrTemplateId: PMSExecutionRequest | string, vars?: Record<string, any>): any;
    private executeAsync;
    private renderTemplate;
    getRegistry(): TemplateRegistry;
}
