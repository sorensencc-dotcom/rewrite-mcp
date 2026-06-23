import { Router } from 'express';
import { MemoryStore } from './MemoryStore';
import { MemorySynthesizer } from './MemorySynthesizer';
/**
 * MemoryAPI: Query endpoints for APR, CRO, ARPS, and operators.
 *
 * Contract:
 * - Read-only access to memory events
 * - Query by type, agent, session, timestamp
 * - Retrieve summaries and trends
 * - <100ms latency on queries
 */
export declare function createMemoryQueryRouter(store: MemoryStore, synthesizer: MemorySynthesizer): Router;
//# sourceMappingURL=MemoryAPI.d.ts.map