import {
  CICButton,
  CICBadge,
  CICText,
} from '../../../components/cic-primitives';
import { cic } from '../../../tokens/cic-tokens';
import type { AgentSummary, AgentStatus } from '../types';

interface AgentListProps {
  agents: AgentSummary[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
}

function statusVariant(status: AgentStatus): 'success' | 'warning' | 'error' {
  if (status === 'online') return 'success';
  if (status === 'degraded') return 'warning';
  return 'error';
}

/**
 * AgentList — Left column: list of all agents with status + cost
 */
export function AgentList({
  agents,
  selectedAgentId,
  onSelectAgent,
}: AgentListProps) {
  return (
    <div className={`${cic.cls.spacingVertical} overflow-y-auto max-h-96`}>
      <CICText variant="label-sm" className="mb-4">
        Agents ({agents.length})
      </CICText>

      <div className="space-y-2">
        {agents.map(agent => (
          <button
            key={agent.id}
            onClick={() => onSelectAgent(agent.id)}
            className={`
              w-full text-left p-3 rounded
              ${cic.cls.border}
              ${selectedAgentId === agent.id ? cic.cls.bgAccent : cic.cls.bgMuted}
              hover:${cic.cls.bgAccentLight}
              transition-colors
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <CICText variant="body-sm" weight="semibold">
                {agent.name}
              </CICText>
              <CICBadge variant={statusVariant(agent.status)} size="xs">
                {agent.status}
              </CICBadge>
            </div>

            <div className="text-xs space-y-1">
              <div className={cic.cls.textMuted}>
                Cost 5m: ${agent.costLast5m.toFixed(2)}
              </div>
              <div className={cic.cls.textMuted}>
                Latency: {agent.heartbeat.latencyMs}ms
              </div>
              <div className={cic.cls.textMuted}>
                Last: {agent.lastExecution ? new Date(agent.lastExecution).toLocaleTimeString() : '—'}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
