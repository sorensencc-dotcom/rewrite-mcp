import { CICText, CICBadge } from '../../../components/cic-primitives';
import { cic } from '../../../tokens/cic-tokens';
import type { ApprovalEntry } from '../types';

interface AgentApprovalHistoryProps {
  approvals: ApprovalEntry[];
}

/**
 * AgentApprovalHistory — Governance approvals + rejections
 * Shows proposal votes and reasoning
 */
export function AgentApprovalHistory({ approvals }: AgentApprovalHistoryProps) {
  if (!approvals.length) {
    return (
      <CICText variant="body-sm" className={cic.cls.textMuted}>
        No approvals yet.
      </CICText>
    );
  }

  return (
    <div className={`${cic.cls.border} rounded overflow-x-auto max-h-96 overflow-y-auto`}>
      <table className="text-xs w-full">
        <thead className={cic.cls.bgMuted}>
          <tr>
            <th className="text-left p-2">Proposal ID</th>
            <th className="text-left p-2">Vote</th>
            <th className="text-left p-2">Timestamp</th>
            <th className="text-left p-2">Reason</th>
          </tr>
        </thead>
        <tbody>
          {approvals.slice().reverse().map((approval, idx) => (
            <tr key={idx} className={`border-t ${cic.cls.borderColor}`}>
              <td className="p-2">
                <span className={cic.cls.fontMono}>{approval.proposalId.slice(0, 12)}…</span>
              </td>
              <td className="p-2">
                <CICBadge
                  variant={approval.vote === 'approve' ? 'success' : 'error'}
                  size="xs"
                >
                  {approval.vote}
                </CICBadge>
              </td>
              <td className="p-2">{new Date(approval.timestamp).toLocaleTimeString()}</td>
              <td className="p-2 text-xs">{approval.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
