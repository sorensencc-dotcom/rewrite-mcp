import { FileAdapter } from './index';
import { SecurityPolicy } from '../../security/SecurityPolicy';
import { MemoryStore } from '../../memory/MemoryStore';
export declare class WaylandFileAdapter implements FileAdapter {
    private policy;
    private memory?;
    constructor(policy: SecurityPolicy, memory?: MemoryStore | undefined);
    read(path: string): Promise<string>;
    write(path: string, content: string): Promise<void>;
    list(path: string): Promise<{
        name: string;
        type: 'file' | 'dir';
    }[]>;
}
