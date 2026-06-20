import { CICText } from '../../../components/cic-primitives';
import { cic } from '../../../tokens/cic-tokens';
import { AgentList } from './AgentList';
import { AgentDetailView } from './AgentDetailView';
import type { AgentSummary, AgentDetail } from '../types';

interface PanelBodyProps {
  agents: AgentSummary[];
  selectedAgentId: string | null;
  agent: AgentDetail | null;
  loading: boolean;
  onSelectAgent: (agentId: string) => void;
  onKill: () => void;
  onClearQueue: () => void;
}

/**
 * PanelBody — Two-column layout: AgentList (left) + AgentDetailView (right)
 */
export function PanelBody({
  agents,
  selectedAgentId,
  agent,
  loading,
  onSelectAgent,
  onKill,
  onClearQueue,
}: PanelBodyProps) {
  if (loading && !agents.length) {
    return (
      <div className={cic.cls.spacingVertical}>
        <CICText variant="body-sm" className={cic.cls.textMuted}>
          Loading agents…
        </CICText>
      </div>
    );
  }

  if (!agents.length) {
    return (
      <div className={cic.cls.spacingVertical}>
        <CICText variant="body-sm" className={cic.cls.textMuted}>
          No agents available.
        </CICText>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Left column: Agent list */}
      <div className="col-span-1">
        <AgentList
          agents={agents}
          selectedAgentId={selectedAgentId}
          onSelectAgent={onSelectAgent}
        />
      </div>

      {/* Right column: Agent detail */}
      <div className="col-span-2">
        {selectedAgentId && agent ? (
          <AgentDetailView
            agent={agent}
            onKill={onKill}
            onClearQueue={onClearQueue}
          />
        ) : (
          <div className={cic.cls.spacingVertical}>
            <CICText variant="body-sm" className={cic.cls.textMuted}>
              Select an agent to view details.
            </CICText>
          </div>
        )}
      </div>
    </div>
  );
}
