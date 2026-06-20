import { useEffect, useState } from 'react';
import type { AgentDetail } from '../types';

/**
 * useAgent — fetch single agent detail with polling
 * @param agentId agent ID (null = no fetch)
 * @param pollIntervalMs polling interval in milliseconds (null or 0 = no polling)
 */
export function useAgent(agentId: string | null, pollIntervalMs: number | null = 0) {
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(agentId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) {
      setAgent(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetch_agent() {
      try {
        const res = await fetch(`/api/agents/${agentId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as AgentDetail;
        if (!cancelled) {
          setAgent(json);
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

    void fetch_agent();

    if (pollIntervalMs && pollIntervalMs > 0) {
      const interval = setInterval(() => void fetch_agent(), pollIntervalMs);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [agentId, pollIntervalMs]);

  return { agent, loading, error };
}
