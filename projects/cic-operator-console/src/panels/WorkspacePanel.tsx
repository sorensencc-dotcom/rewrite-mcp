import { useEffect, useState } from 'react';
import {
  CICPanel,
  CICGrid,
  CICDivider,
  CICLogStream,
} from '../components/cic-primitives';
import { cic } from '../tokens/cic-tokens';

// ── Types ─────────────────────────────────────────────────────────────────────

interface WorkspaceUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Permission {
  name: string;
  granted: boolean;
}

interface ActivityLog {
  id: string;
  action: string;
  timestamp: string;
  actor?: string;
}

interface WorkspaceData {
  user: WorkspaceUser;
  permissions: Permission[];
  activityLog: ActivityLog[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return ts;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * WorkspacePanel — Console v3 Tier 2 (33% width)
 * Displays user info, permissions, and recent activity log.
 * Data source: GET /api/cic/workspace — refreshes every 10 s.
 */
export function WorkspacePanel({ className = '' }: { className?: string }) {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchWorkspace() {
      try {
        const res = await fetch('/api/console/workspace');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const envelope = (await res.json()) as { status: string; data?: WorkspaceData; error?: any };
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

    void fetchWorkspace();
    const interval = setInterval(() => void fetchWorkspace(), 10_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <CICPanel title="Workspace" className={className}>
      {loading && !data && (
        <p className={`${cic.cls.textMuted} text-sm`}>Loading…</p>
      )}
      {error && (
        <p className={`${cic.cls.error} text-xs ${cic.cls.fontMono}`}>{error}</p>
      )}
      {data && (
        <CICGrid cols={1} gap={4}>
          {/* User section */}
          <div>
            <h3 className={`text-xs font-semibold ${cic.cls.textMuted} uppercase mb-2`}>User</h3>
            <div className="space-y-1">
              <div>
                <span className={`text-sm font-semibold ${cic.cls.textPrimary}`}>
                  {data.user.name}
                </span>
              </div>
              <div className={`text-xs ${cic.cls.textMuted}`}>
                {data.user.email}
              </div>
              <div className={`text-xs ${cic.cls.textSecondary}`}>
                Role: <span className="font-mono">{data.user.role}</span>
              </div>
            </div>
          </div>

          <CICDivider />

          {/* Permissions section */}
          <div>
            <h3 className={`text-xs font-semibold ${cic.cls.textMuted} uppercase mb-2`}>Permissions</h3>
            <div className="space-y-1">
              {data.permissions.map((perm) => (
                <div key={perm.name} className="flex items-center justify-between text-xs">
                  <span className={cic.cls.textSecondary}>{perm.name}</span>
                  <span className={perm.granted ? cic.cls.success : cic.cls.error}>
                    {perm.granted ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <CICDivider />

          {/* Activity log section */}
          <div>
            <h3 className={`text-xs font-semibold ${cic.cls.textMuted} uppercase mb-2`}>Recent Activity</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {data.activityLog.length > 0 ? (
                data.activityLog.map((log) => (
                  <div key={log.id} className="text-xs border-l-2 border-[#3a3a50] pl-2 py-1">
                    <div className={`${cic.cls.textPrimary}`}>{log.action}</div>
                    <div className={`${cic.cls.textMuted} ${cic.cls.fontMono} text-xs`}>
                      {formatTime(log.timestamp)}
                      {log.actor && ` • ${log.actor}`}
                    </div>
                  </div>
                ))
              ) : (
                <p className={`${cic.cls.textMuted} text-xs`}>No recent activity.</p>
              )}
            </div>
          </div>
        </CICGrid>
      )}
    </CICPanel>
  );
}
