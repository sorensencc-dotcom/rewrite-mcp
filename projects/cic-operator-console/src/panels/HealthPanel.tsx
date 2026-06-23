import { useEffect, useState } from 'react';
import {
  CICPanel,
  CICGrid,
  CICStat,
  CICBadge,
} from '../components/cic-primitives';
import { cic } from '../tokens/cic-tokens';

// ── Types ─────────────────────────────────────────────────────────────────────

type HealthStatus = 'green' | 'yellow' | 'red';

interface CICHealthData {
  status: HealthStatus;
  uptimePercent: number;
  activeServices: number;
  lastErrorAt: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusTone(s: HealthStatus): 'success' | 'warning' | 'error' {
  if (s === 'green')  return 'success';
  if (s === 'yellow') return 'warning';
  return 'error';
}

function statusVariant(s: HealthStatus): 'success' | 'warning' | 'error' {
  return statusTone(s);
}

function statusLabel(s: HealthStatus): string {
  if (s === 'green')  return 'Healthy';
  if (s === 'yellow') return 'Degraded';
  return 'Critical';
}

function formatLastError(ts: string | null): string {
  if (!ts) return 'None';
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return ts;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * HealthPanel — Console v3 Tier 1 (60% width, top-left)
 * Displays overall CIC system health, uptime, active services, and last error.
 * Data source: GET /api/cic/health — refreshes every 10 s.
 */
export function HealthPanel({ className = '' }: { className?: string }) {
  const [data, setData] = useState<CICHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchHealth() {
      try {
        const res = await fetch('/api/console/health');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const envelope = (await res.json()) as { status: string; data?: CICHealthData; error?: any };
        if (envelope.status !== 'ok' || !envelope.data) throw new Error(envelope.error?.message || 'Invalid response');
        if (!cancelled) {
          setData(envelope.data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Fetch failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchHealth();
    const interval = setInterval(() => void fetchHealth(), 10_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const badge = data ? (
    <CICBadge variant={statusVariant(data.status)} dot size="sm">
      {statusLabel(data.status)}
    </CICBadge>
  ) : null;

  return (
    <CICPanel title="CIC Health" action={badge} className={className}>
      {loading && !data && (
        <p className={`${cic.cls.textMuted} text-sm`}>Loading…</p>
      )}
      {error && (
        <p className={`${cic.cls.error} text-xs ${cic.cls.fontMono}`}>{error}</p>
      )}
      {data && (
        <CICGrid cols={4} gap={4}>
          <CICStat
            label="Health"
            value={statusLabel(data.status)}
            tone={statusTone(data.status)}
          />
          <CICStat
            label="Uptime"
            value={data.uptimePercent.toFixed(2)}
            unit="%"
            tone={data.uptimePercent >= 99 ? 'success' : data.uptimePercent >= 95 ? 'warning' : 'error'}
          />
          <CICStat
            label="Services"
            value={data.activeServices}
            tone="accent"
          />
          <CICStat
            label="Last Error"
            value={formatLastError(data.lastErrorAt)}
            tone={data.lastErrorAt ? 'error' : 'success'}
          />
        </CICGrid>
      )}
    </CICPanel>
  );
}
