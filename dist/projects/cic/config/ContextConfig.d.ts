/**
 * CIC Context Service Configuration
 */
export interface ContextConfig {
    port: number;
    host: string;
    apiVersion: string;
    crg: {
        baseUrl: string;
        timeout: number;
    };
    cic: {
        baseUrl: string;
        timeout: number;
    };
    cache: {
        ttl: number;
        maxSize: number;
        enabled: boolean;
    };
    timeouts: {
        request: number;
        slice: number;
        query: number;
    };
    ruflo: {
        maxConcurrency: number;
        defaultTimeout: number;
        registry: {
            cacheEnabled: boolean;
        };
    };
    observability: {
        tracing: {
            enabled: boolean;
            sampleRate: number;
        };
        metrics: {
            enabled: boolean;
            interval: number;
        };
        health: {
            checkInterval: number;
        };
    };
    logging: {
        level: "debug" | "info" | "warn" | "error";
        format: "json" | "text";
    };
}
/**
 * Load configuration from environment + defaults
 */
export declare function loadConfig(): ContextConfig;
/**
 * Validate configuration
 */
export declare function validateConfig(config: ContextConfig): string[];
declare const _default: {
    loadConfig: typeof loadConfig;
    validateConfig: typeof validateConfig;
};
export default _default;
//# sourceMappingURL=ContextConfig.d.ts.map