export interface GovernanceSignal {
    signalId: string;
    timestamp: number;
    type: 'violation' | 'warning' | 'audit';
    adapter: 'shell' | 'file' | 'http' | 'model' | 'browser';
    action: string;
    reason: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    blocked: boolean;
}
export interface SecurityRule {
    id: string;
    type: 'shell' | 'file' | 'http' | 'model' | 'browser';
    action: 'allow' | 'deny';
    pattern: string | RegExp;
    reason: string;
}
export interface EnforcementResult {
    allowed: boolean;
    reason: string;
    signal?: GovernanceSignal;
}
export interface SecurityConfig {
    shell?: {
        allowedCommands?: string[];
        deniedPatterns?: string[];
    };
    file?: {
        allowedRoots?: string[];
        readOnlyRoots?: string[];
    };
    http?: {
        allowedDomains?: string[];
    };
    model?: {
        maxTokens?: number;
        temperatureMax?: number;
    };
    browser?: {
        deniedPatterns?: string[];
    };
}
export declare class SecurityPolicy {
    private rules;
    private signals;
    private config;
    constructor(config?: SecurityConfig);
    private initializeFromConfig;
    private initializeDefaults;
    enforceShell(command: string): EnforcementResult;
    enforceFile(path: string): EnforcementResult;
    enforceFilePath(path: string, isWrite?: boolean): EnforcementResult;
    enforceHttp(url: string): EnforcementResult;
    enforceHttpDomain(url: string): EnforcementResult;
    enforceModel(tokenLimit: number): EnforcementResult;
    enforceModelOptions(options: {
        maxTokens?: number;
        temperature?: number;
    }): EnforcementResult;
    enforceBrowser(query: string): EnforcementResult;
    private enforceRule;
    private createSignal;
    getSignals(): GovernanceSignal[];
    addRule(rule: SecurityRule): void;
    clearSignals(): void;
}
