import { ShellAdapter } from './index';
import { SecurityPolicy } from '../../security/SecurityPolicy';
import { MemoryStore } from '../../memory/MemoryStore';
export declare class SecurityViolationError extends Error {
    signal: any;
    constructor(signal: any, message: string);
}
export declare class WaylandShellAdapter implements ShellAdapter {
    private policy;
    private memory?;
    constructor(policy: SecurityPolicy, memory?: MemoryStore | undefined);
    execute(command: string, args: string[], options?: {
        timeoutMs?: number;
    }): Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
    }>;
}
