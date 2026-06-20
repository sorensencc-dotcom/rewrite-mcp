import { useEffect, useState } from 'react';
import {
  CICPanel,
  CICGrid,
  CICCard,
  CICBadge,
  CICMetric,
} from '../components/cic-primitives';
import { cic } from '../tokens/cic-tokens';

// ── Types ─────────────────────────────────────────────────────────────────────

type AgentStatus = 'idle' | 'running' | 'error' | 'offline';

interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  cpuPercent: number;
  memoryMB: number;
  maxMemoryMB: number;
  tasksCompleted: number;
  uptimeSeconds: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusVariant(s: AgentStatus): 'accent' | 'warning' | 'error' | 'success' {
  if (s === 'running')  return 'accent';
  if (s === 'idle')     return 'success';
  if (s === 'error')    return 'error';
  return 'warning';
}

function statusLabel(s: AgentStatus): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * AgentsPanel — Console v3 Tier 2 (33% width)
 * Lists active CIC agents with CPU, memory, and status.
 * Data source: GET /api/cic/agents — refreshes every 5 s.
 */
export function AgentsPanel({ className = '' }: { className?: string }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAgents() {
      try {
        const res = await fetch('/api/cic/agents');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as Agent[];
        if (!cancelled) {
          setAgents(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Fetch failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchAgents();
    const interval = setInterval(() => void fetchAgents(), 5_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <CICPanel title="Agents" className={className}>
      {loading && agents.length === 0 && (
        <p className={`${cic.cls.textMuted} text-sm`}>Loading…</p>
      )}
      {error && (
        <p className={`${cic.cls.error} text-xs ${cic.cls.fontMono}`}>{error}</p>
      )}
      {!loading && agents.length === 0 && !error && (
        <p className={`${cic.cls.textMuted} text-sm`}>No agents running.</p>
      )}
      {agents.length > 0 && (
        <CICGrid cols={1} gap={3}>
          {agents.map((agent) => (
            <CICCard key={agent.id} status={agent.status === 'error' ? 'error' : 'default'}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className={`text-sm font-semibold ${cic.cls.textPrimary} truncate`}>
                    {agent.name}
                  </span>
                  <span className={`text-xs ${cic.cls.textMuted}`}>
                    ID: {agent.id.slice(0, 8)}
                  </span>
                </div>
                <CICBadge variant={statusVariant(agent.status)} dot={agent.status === 'running'} size="sm">
                  {statusLabel(agent.status)}
                </CICBadge>
              </div>

              {/* Metrics grid */}
              <CICGrid cols={3} gap={2}>
                <div>
                  <div className={`text-xs ${cic.cls.textMuted} mb-1`}>CPU</div>
                  <div className={`text-sm font-semibold ${cic.cls.textPrimary}`}>
                    {agent.cpuPercent.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className={`text-xs ${cic.cls.textMuted} mb-1`}>Memory</div>
                  <div className={`text-sm font-semibold ${cic.cls.textPrimary}`}>
                    {agent.memoryMB}/{agent.maxMemoryMB}MB
                  </div>
                </div>
                <div>
                  <div className={`text-xs ${cic.cls.textMuted} mb-1`}>Uptime</div>
                  <div className={`text-sm font-semibold ${cic.cls.textPrimary}`}>
                    {formatUptime(agent.uptimeSeconds)}
                  </div>
                </div>
              </CICGrid>

              {/* Tasks completed */}
              <div className="mt-2 pt-2 border-t border-[#3a3a50]">
                <span className={`text-xs ${cic.cls.textMuted}`}>
                  {agent.tasksCompleted} tasks completed
                </span>
              </div>
            </CICCard>
          ))}
        </CICGrid>
      )}
    </CICPanel>
  );
}
