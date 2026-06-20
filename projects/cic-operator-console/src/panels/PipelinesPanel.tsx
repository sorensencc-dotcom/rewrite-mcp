import { useEffect, useState } from 'react';
import {
  CICPanel,
  CICGrid,
  CICCard,
  CICBadge,
} from '../components/cic-primitives';
import { cic } from '../tokens/cic-tokens';

// ── Types ─────────────────────────────────────────────────────────────────────

type PipelineStatus = 'running' | 'paused' | 'error' | 'complete';

interface Pipeline {
  id: string;
  name: string;
  progressPercent: number;
  etaSeconds: number | null;
  status: PipelineStatus;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pipelineVariant(s: PipelineStatus): 'accent' | 'warning' | 'error' | 'success' {
  if (s === 'running')  return 'accent';
  if (s === 'paused')   return 'warning';
  if (s === 'error')    return 'error';
  return 'success';
}

function formatEta(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * PipelinesPanel — Console v3 Tier 1 (40% width, top-right)
 * Lists running pipelines with progress, ETA, and status badge.
 * Data source: GET /api/cic/pipelines — refreshes every 5 s.
 */
export function PipelinesPanel({ className = '' }: { className?: string }) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPipelines() {
      try {
        const res = await fetch('/api/cic/pipelines');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as Pipeline[];
        if (!cancelled) {
          setPipelines(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Fetch failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchPipelines();
    const interval = setInterval(() => void fetchPipelines(), 5_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <CICPanel title="Pipelines" className={className}>
      {loading && pipelines.length === 0 && (
        <p className={`${cic.cls.textMuted} text-sm`}>Loading…</p>
      )}
      {error && (
        <p className={`${cic.cls.error} text-xs ${cic.cls.fontMono}`}>{error}</p>
      )}
      {!loading && pipelines.length === 0 && !error && (
        <p className={`${cic.cls.textMuted} text-sm`}>No active pipelines.</p>
      )}
      {pipelines.length > 0 && (
        <CICGrid cols={1} gap={3}>
          {pipelines.map((p) => (
            <CICCard key={p.id} status={p.status === 'error' ? 'error' : p.status === 'complete' ? 'success' : 'default'}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className={`text-sm font-semibold ${cic.cls.textPrimary} truncate`}>{p.name}</span>
                  <span className={`text-xs ${cic.cls.textMuted} ${cic.cls.fontMono}`}>
                    ETA: {formatEta(p.etaSeconds)}
                  </span>
                </div>
                <CICBadge variant={pipelineVariant(p.status)} dot={p.status === 'running'} size="sm">
                  {p.status}
                </CICBadge>
              </div>
              {/* Semantic progress meter — no inline style required */}
              <meter
                value={p.progressPercent}
                min={0}
                max={100}
                aria-label={`${p.name} progress`}
                className={[
                  'mt-3 w-full h-1.5 rounded-full appearance-none',
                  p.status === 'error'    ? 'accent-red-500'    :
                  p.status === 'complete' ? 'accent-green-500'  :
                  p.status === 'paused'   ? 'accent-amber-500'  :
                  'accent-indigo-500',
                ].join(' ')}
              />
              <div className="mt-1 flex justify-end">
                <span className={`text-xs ${cic.cls.textMuted} ${cic.cls.fontMono} tabular-nums`}>
                  {p.progressPercent.toFixed(0)}%
                </span>
              </div>
            </CICCard>
          ))}
        </CICGrid>
      )}
    </CICPanel>
  );
}
