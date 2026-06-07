import { RunSummary } from '../../contracts/RunSummary';

export function makeRunSeriesStable(): RunSummary[] {
  return [
    {
      runId: 'run-1',
      timestamp: '2026-01-01T10:00:00Z',
      driftScore: 0.1,
      contradictionScore: 0.05,
      semanticScore: 0.85,
    },
    {
      runId: 'run-2',
      timestamp: '2026-01-01T11:00:00Z',
      driftScore: 0.11,
      contradictionScore: 0.06,
      semanticScore: 0.84,
    },
    {
      runId: 'run-3',
      timestamp: '2026-01-01T12:00:00Z',
      driftScore: 0.12,
      contradictionScore: 0.05,
      semanticScore: 0.85,
    },
    {
      runId: 'run-4',
      timestamp: '2026-01-01T13:00:00Z',
      driftScore: 0.1,
      contradictionScore: 0.06,
      semanticScore: 0.84,
    },
  ];
}

export function makeRunSeriesDegrading(): RunSummary[] {
  return [
    {
      runId: 'run-1',
      timestamp: '2026-01-01T10:00:00Z',
      driftScore: 0.1,
      contradictionScore: 0.05,
      semanticScore: 0.85,
    },
    {
      runId: 'run-2',
      timestamp: '2026-01-01T11:00:00Z',
      driftScore: 0.15,
      contradictionScore: 0.1,
      semanticScore: 0.75,
    },
    {
      runId: 'run-3',
      timestamp: '2026-01-01T12:00:00Z',
      driftScore: 0.25,
      contradictionScore: 0.2,
      semanticScore: 0.65,
    },
    {
      runId: 'run-4',
      timestamp: '2026-01-01T13:00:00Z',
      driftScore: 0.35,
      contradictionScore: 0.3,
      semanticScore: 0.55,
    },
  ];
}

export function makeRunSeriesImproving(): RunSummary[] {
  return [
    {
      runId: 'run-1',
      timestamp: '2026-01-01T10:00:00Z',
      driftScore: 0.4,
      contradictionScore: 0.35,
      semanticScore: 0.5,
    },
    {
      runId: 'run-2',
      timestamp: '2026-01-01T11:00:00Z',
      driftScore: 0.3,
      contradictionScore: 0.25,
      semanticScore: 0.6,
    },
    {
      runId: 'run-3',
      timestamp: '2026-01-01T12:00:00Z',
      driftScore: 0.2,
      contradictionScore: 0.15,
      semanticScore: 0.7,
    },
    {
      runId: 'run-4',
      timestamp: '2026-01-01T13:00:00Z',
      driftScore: 0.1,
      contradictionScore: 0.05,
      semanticScore: 0.8,
    },
  ];
}

export function makeSingleRun(): RunSummary {
  return {
    runId: 'single-run',
    timestamp: '2026-01-01T10:00:00Z',
    driftScore: 0.15,
    contradictionScore: 0.1,
    semanticScore: 0.75,
  };
}
