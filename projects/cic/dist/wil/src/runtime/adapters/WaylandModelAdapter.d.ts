import { ModelAdapter } from './index';
import { SecurityPolicy } from '../../security/SecurityPolicy';
import { MemoryStore } from '../../memory/MemoryStore';
export declare class WaylandModelAdapter implements ModelAdapter {
    private policy;
    private memory?;
    constructor(policy: SecurityPolicy, memory?: MemoryStore | undefined);
    invoke(prompt: string, options: {
        maxTokens: number;
        temperature: number;
    }): Promise<{
        text: string;
    }>;
}
