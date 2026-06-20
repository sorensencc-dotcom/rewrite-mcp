import {
  CICButton,
  CICButtonGroup,
  CICTabs,
} from '../../../components/cic-primitives';
import { cic } from '../../../tokens/cic-tokens';
import { AgentMetadata } from './AgentMetadata';
import { AgentHeartbeat } from './AgentHeartbeat';
import { AgentCostTimeline } from './AgentCostTimeline';
import { AgentExecutionLog } from './AgentExecutionLog';
import { AgentApprovalHistory } from './AgentApprovalHistory';
import { AgentSkillUsage } from './AgentSkillUsage';
import type { AgentDetail } from '../types';

interface AgentDetailViewProps {
  agent: AgentDetail;
  onKill: () => void;
  onClearQueue: () => void;
}

/**
 * AgentDetailView — Right column: tabbed detail view
 * Tabs: Metadata, Heartbeat, Cost, Logs, Approvals, Skills
 */
export function AgentDetailView({
  agent,
  onKill,
  onClearQueue,
}: AgentDetailViewProps) {
  const tabs = [
    {
      label: 'Metadata',
      content: <AgentMetadata metadata={agent.metadata} />,
    },
    {
      label: 'Heartbeat',
      content: <AgentHeartbeat heartbeat={agent.heartbeat} />,
    },
    {
      label: 'Cost',
      content: <AgentCostTimeline timeline={agent.costTimeline} />,
    },
    {
      label: 'Logs',
      content: <AgentExecutionLog logs={agent.executionLog} />,
    },
    {
      label: 'Approvals',
      content: <AgentApprovalHistory approvals={agent.approvalHistory} />,
    },
    {
      label: 'Skills',
      content: <AgentSkillUsage skills={agent.skillUsage} />,
    },
  ];

  return (
    <div className={cic.cls.spacingVertical}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`${cic.cls.heading3}`}>{agent.metadata.name}</h3>
        <CICButtonGroup>
          <CICButton variant="danger" size="sm" onClick={onKill}>
            Kill
          </CICButton>
          <CICButton variant="secondary" size="sm" onClick={onClearQueue}>
            Clear Queue
          </CICButton>
        </CICButtonGroup>
      </div>

      <CICTabs tabs={tabs} />
    </div>
  );
}
