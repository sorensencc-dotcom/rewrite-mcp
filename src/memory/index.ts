/**
 * CIC Memory Layer - Barrel exports
 *
 * Usage:
 * import {
 *   MemoryStore, getMemoryStore,
 *   MemoryHarvester, getMemoryHarvester,
 *   MemorySynthesizer, getMemorySynthesizer,
 *   createMemoryIngestRouter, createMemoryQueryRouter
 * } from '@cic/memory';
 */

export { MemoryStore, getMemoryStore, resetMemoryStore } from './MemoryStore';
export type { MemoryEvent, QueryOptions, ValidationResult } from './MemoryStore';

export { MemoryHarvester, createMemoryIngestRouter, getMemoryHarvester } from './MemoryHarvester';
export type { IngestRequest, IngestResponse } from './MemoryHarvester';

export { MemorySynthesizer, getMemorySynthesizer, resetMemorySynthesizer } from './MemorySynthesizer';
export type { WeeklySummary, MonthlySummary, TrendLine, EventTypeStats } from './MemorySynthesizer';

export { createMemoryQueryRouter } from './MemoryAPI';
