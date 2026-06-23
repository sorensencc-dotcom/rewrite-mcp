import { useEffect, useState } from 'react';
import type { AgentSummary } from '../types';

/**
 * useAgentList — fetch all agents with polling
 * @param pollIntervalMs polling interval in milliseconds (0 = no polling)
 */
export function useAgentList(pollIntervalMs: number = 0) {
  const [agents, setAgents] = useState<AgentSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch_agents() {
      try {
        const res = await fetch('/api/console/agents');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const envelope = (await res.json()) as { status: string; data?: AgentSummary[]; error?: any };
        if (envelope.status !== 'ok' || !envelope.data) throw new Error(envelope.error?.message || 'Invalid response');
        if (!cancelled) {
          setAgents(envelope.data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Fetch failed');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetch_agents();

    if (pollIntervalMs > 0) {
      const interval = setInterval(() => void fetch_agents(), pollIntervalMs);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [pollIntervalMs]);

  return { agents, loading, error };
}
