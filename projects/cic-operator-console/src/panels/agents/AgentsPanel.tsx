import { useEffect, useState } from 'react';
import {
  CICPanel,
  CICBadge,
} from '../../components/cic-primitives';
import { useAgentList } from './hooks/useAgentList';
import { useAgent } from './hooks/useAgent';
import { PanelHeader } from './components/PanelHeader';
import { PanelBody } from './components/PanelBody';
import type { StatusSummary } from './types';

/**
 * AgentsPanel — Console v3 Tier 2 (full width, bottom half)
 * Displays operator-grade agent instrumentation.
 *
 * Data sources:
 * - GET /api/agents → AgentList (polling every 5s)
 * - GET /api/agents/:id → AgentDetail (polling every 5s)
 * - WS /stream/agents → heartbeat + logs (WebSocket ready, fallback to polling)
 */
export function AgentsPanel({ className = '' }: { className?: string }) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const { agents, loading: agentsLoading, error: agentsError } = useAgentList(5000);
  const { agent, loading: detailLoading, error: detailError } = useAgent(
    selectedAgentId,
    selectedAgentId ? 5000 : null
  );

  useEffect(() => {
    if (agents && agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  const error = agentsError || detailError;
  const loading = (agentsLoading && !agents) || (detailLoading && !agent);

  const statusSummary: StatusSummary | null = agents
    ? {
        online: agents.filter(a => a.status === 'online').length,
        degraded: agents.filter(a => a.status === 'degraded').length,
        offline: agents.filter(a => a.status === 'offline').length,
        total: agents.length,
        lastUpdate: new Date().toISOString(),
      }
    : null;

  const handleInvoke = async (agentId: string) => {
    try {
      const res = await fetch(`/api/agents/${agentId}/invoke`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error('Invoke failed:', err);
    }
  };

  const handlePause = async (agentId: string) => {
    try {
      const res = await fetch(`/api/agents/${agentId}/pause`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error('Pause failed:', err);
    }
  };

  const handleRestart = async (agentId: string) => {
    try {
      const res = await fetch(`/api/agents/${agentId}/restart`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error('Restart failed:', err);
    }
  };

  const handleSnapshot = async (agentId: string) => {
    try {
      const res = await fetch(`/api/agents/${agentId}/snapshot`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error('Snapshot failed:', err);
    }
  };

  return (
    <CICPanel title="Agents" className={className}>
      <PanelHeader
        statusSummary={statusSummary}
        loading={loading}
        error={error}
        onInvoke={() => selectedAgentId && handleInvoke(selectedAgentId)}
        onPause={() => selectedAgentId && handlePause(selectedAgentId)}
        onRestart={() => selectedAgentId && handleRestart(selectedAgentId)}
        onSnapshot={() => selectedAgentId && handleSnapshot(selectedAgentId)}
      />

      <PanelBody
        agents={agents || []}
        selectedAgentId={selectedAgentId}
        agent={agent}
        loading={loading}
        onSelectAgent={setSelectedAgentId}
        onKill={() => selectedAgentId && fetch(`/api/agents/${selectedAgentId}/kill`, { method: 'POST' })}
        onClearQueue={() => selectedAgentId && fetch(`/api/agents/${selectedAgentId}/clear-queue`, { method: 'POST' })}
      />
    </CICPanel>
  );
}
