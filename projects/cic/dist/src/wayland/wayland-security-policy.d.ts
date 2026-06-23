export interface ToolRule {
    id: string;
    name: string;
    allowed: boolean;
    maxDurationMs?: number;
    allowedPaths?: string[];
    allowedHosts?: string[];
    allowedCommands?: string[];
    allowWrite?: boolean;
    requiresApproval?: boolean;
}
export interface SecurityPolicyConfig {
    tools: ToolRule[];
}
export declare class WaylandSecurityPolicy {
    private readonly rules;
    constructor(cfg: SecurityPolicyConfig);
    isToolAllowed(id: string): boolean;
    getToolRule(id: string): ToolRule | undefined;
    validateShellCommand(id: string, command: string, workingDir: string): boolean;
    validateFileOperation(id: string, operation: 'read' | 'write' | 'delete', path: string): boolean;
    validateHttpRequest(id: string, host: string, method: string): boolean;
    requiresApproval(id: string): boolean;
    getMaxDuration(id: string): number | undefined;
}
export declare const createDefaultSecurityPolicy: () => WaylandSecurityPolicy;
