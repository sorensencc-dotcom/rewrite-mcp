export * from "./store/memory-store.js";
export * from "./store/memory-store.types.js";
export * from "./store/memory-store.errors.js";
export * from "./validation/memory-validator.js";
export * from "./integrity/memory-integrity.js";
export interface IMemoryQuery {
    getByDateRange(from: string, to: string, eventType?: any): Promise<any[]>;
    getRecent(days?: number): Promise<any[]>;
    getByType(eventType: any): Promise<any[]>;
}
export interface IMemoryRetention {
    archiveOlderThan(days: number): Promise<void>;
    distillOlderThan(days: number): Promise<Record<string, any>>;
}
//# sourceMappingURL=index.d.ts.map