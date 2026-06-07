/**
 * packages/orchestrator/src/regions/registry.mjs
 * @version 1.0.0
 *
 * Region registry — initialization, lookup, enumeration.
 * Single source of truth for region state.
 */

const regions = new Map();
let initialized = false;

export function initRegions(regionIds) {
  if (initialized) {
    throw new Error('Regions already initialized');
  }

  regionIds.forEach(id => {
    regions.set(id, {
      id,
      status: 'healthy',
      createdAt: new Date().toISOString(),
    });
  });

  initialized = true;
}

export function getRegion(id) {
  return regions.get(id);
}

export function listRegions() {
  return Array.from(regions.values());
}

export function isInitialized() {
  return initialized;
}

export function setRegionStatus(id, status) {
  const region = regions.get(id);
  if (!region) {
    throw new Error(`Region ${id} not found`);
  }
  region.status = status;
  region.updatedAt = new Date().toISOString();
}
