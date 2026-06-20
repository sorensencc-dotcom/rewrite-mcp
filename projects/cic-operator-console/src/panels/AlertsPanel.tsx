import { useEffect, useState } from 'react';
import {
  CICPanel,
  CICAlert,
} from '../components/cic-primitives';
import { cic } from '../tokens/cic-tokens';

// ── Types ─────────────────────────────────────────────────────────────────────

type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: string;
  source?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(ts: string): string {
  try {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString();
  } catch {
    return ts;
  }
}

function alertVariant(s: AlertSeverity): 'info' | 'warning' | 'error' | 'success' {
  if (s === 'critical') return 'error';
  if (s === 'error') return 'error';
  if (s === 'warning') return 'warning';
  return 'info';
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * AlertsPanel — Console v3 Tier 2 (33% width)
 * Displays system alerts, warnings, and errors.
 * Data source: GET /api/cic/alerts — refreshes every 3 s.
 */
export function AlertsPanel({ className = '' }: { className?: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAlerts() {
      try {
        const res = await fetch('/api/cic/alerts');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as Alert[];
        if (!cancelled) {
          setAlerts(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Fetch failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchAlerts();
    const interval = setInterval(() => void fetchAlerts(), 3_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <CICPanel title="Alerts" className={className}>
      {loading && alerts.length === 0 && (
        <p className={`${cic.cls.textMuted} text-sm`}>Loading…</p>
      )}
      {error && (
        <p className={`${cic.cls.error} text-xs ${cic.cls.fontMono}`}>{error}</p>
      )}
      {!loading && alerts.length === 0 && !error && (
        <p className={`${cic.cls.textMuted} text-sm`}>No active alerts.</p>
      )}
      {alerts.length > 0 && (
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
          {alerts.map((alert) => (
            <CICAlert
              key={alert.id}
              variant={alertVariant(alert.severity)}
              title={alert.title}
              message={alert.message}
              dismissible={false}
            >
              <div className={`mt-2 flex items-center justify-between text-xs ${cic.cls.textMuted}`}>
                {alert.source && <span>{alert.source}</span>}
                <span className={cic.cls.fontMono}>{formatTime(alert.timestamp)}</span>
              </div>
            </CICAlert>
          ))}
        </div>
      )}
    </CICPanel>
  );
}
