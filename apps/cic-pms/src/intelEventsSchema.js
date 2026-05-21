// apps/cic-pms/src/intelEventsSchema.js
// Single canonical shape for intelligence events
// type: 'model_call' | 'drift' | 'pack_usage' | 'pipeline' | 'override' | 'prp'

export function normalizeEvent(raw) {
  return {
    id: raw.id || `${raw.type}-${raw.ts || Date.now()}-${raw.region || 'global'}`,
    ts: raw.ts || new Date().toISOString(),
    type: raw.type,
    region: raw.region || 'global',
    subsystem: raw.subsystem || null,
    pack: raw.pack || null,
    version: raw.version || null,
    agent: raw.agent || null,
    jobId: raw.jobId || null,
    action: raw.action || null, // e.g. RESET, KILL, PROMOTE, ROLLBACK
    meta: raw.meta || {}
  };
}
