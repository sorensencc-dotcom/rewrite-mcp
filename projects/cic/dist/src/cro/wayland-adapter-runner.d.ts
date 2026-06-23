import { TaskExecution, AgentRunner } from './types.js';
import { SecurityConfig } from '../../wil/src/security/SecurityPolicy.js';
import { WaylandShellAdapter } from '../../wil/src/runtime/adapters/WaylandShellAdapter.js';
import { WaylandFileAdapter } from '../../wil/src/runtime/adapters/WaylandFileAdapter.js';
import { WaylandHttpAdapter } from '../../wil/src/runtime/adapters/WaylandHttpAdapter.js';
import { WaylandModelAdapter } from '../../wil/src/runtime/adapters/WaylandModelAdapter.js';
import { MemoryStore } from '../../wil/src/memory/MemoryStore.js';
export interface AdapterSet {
    shell: WaylandShellAdapter;
    file: WaylandFileAdapter;
    http: WaylandHttpAdapter;
    model: WaylandModelAdapter;
}
export declare class WaylandAdapterRunner implements AgentRunner {
    private policy;
    private adapters;
    private memory?;
    constructor(adapters: AdapterSet, securityConfig?: SecurityConfig, memory?: MemoryStore);
    run(task: TaskExecution, isDryRun: boolean): Promise<any>;
    private executeAdapterOperation;
}
