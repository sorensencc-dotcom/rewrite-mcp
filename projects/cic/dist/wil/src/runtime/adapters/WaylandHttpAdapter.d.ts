import { HttpAdapter } from './index';
import { SecurityPolicy } from '../../security/SecurityPolicy';
import { MemoryStore } from '../../memory/MemoryStore';
export declare class WaylandHttpAdapter implements HttpAdapter {
    private policy;
    private memory?;
    constructor(policy: SecurityPolicy, memory?: MemoryStore | undefined);
    get(url: string): Promise<{
        status: number;
        body: string;
    }>;
    post(url: string, body: any): Promise<{
        status: number;
        body: string;
    }>;
}
