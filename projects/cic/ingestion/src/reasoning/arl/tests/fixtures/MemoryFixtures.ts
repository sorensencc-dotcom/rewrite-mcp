import { MemorySnapshot } from '../../contracts/MemorySnapshot';

export function makeConsistentMemorySnapshot(): MemorySnapshot {
  return {
    id: 'consistent-1',
    version: '1.0',
    capturedAt: new Date().toISOString(),
    entities: [
      {
        entityId: 'entity-1',
        events: [
          {
            timestamp: '2026-01-01T10:00:00Z',
            description: 'Entity created and active',
          },
          {
            timestamp: '2026-01-02T10:00:00Z',
            description: 'Entity remains active',
          },
          {
            timestamp: '2026-01-03T10:00:00Z',
            description: 'Entity still active',
          },
        ],
      },
      {
        entityId: 'entity-2',
        events: [
          {
            timestamp: '2026-01-01T12:00:00Z',
            description: 'Entity present',
          },
          {
            timestamp: '2026-01-02T12:00:00Z',
            description: 'Entity still present',
          },
        ],
      },
    ],
  };
}

export function makeInconsistentMemorySnapshot(): MemorySnapshot {
  return {
    id: 'inconsistent-1',
    version: '1.0',
    capturedAt: new Date().toISOString(),
    entities: [
      {
        entityId: 'entity-1',
        events: [
          {
            timestamp: '2026-01-03T10:00:00Z',
            description: 'Entity created and active',
          },
          {
            timestamp: '2026-01-01T10:00:00Z',
            description: 'Entity created and active',
          },
        ],
      },
      {
        entityId: 'entity-2',
        events: [
          {
            timestamp: '2026-01-01T12:00:00Z',
            description: 'Entity active',
          },
          {
            timestamp: '2026-01-02T12:00:00Z',
            description: 'Entity became inactive',
          },
          {
            timestamp: '2026-01-03T12:00:00Z',
            description: 'Entity active again',
          },
        ],
      },
    ],
  };
}

export function makeEmptyMemorySnapshot(): MemorySnapshot {
  return {
    id: 'empty-1',
    version: '1.0',
    capturedAt: new Date().toISOString(),
    entities: [],
  };
}

export function makeMemorySnapshotWithMissingEntity(): MemorySnapshot {
  return {
    id: 'missing-1',
    version: '1.0',
    capturedAt: new Date().toISOString(),
    entities: [
      {
        entityId: 'entity-1',
        events: [],
      },
      {
        entityId: 'entity-2',
        events: [
          {
            timestamp: '2026-01-01T12:00:00Z',
            description: 'Entity present',
          },
        ],
      },
    ],
  };
}
