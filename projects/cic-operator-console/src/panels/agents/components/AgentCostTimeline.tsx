import { CICText } from '../../../components/cic-primitives';
import { cic } from '../../../tokens/cic-tokens';
import type { CostPoint } from '../types';

interface AgentCostTimelineProps {
  timeline: CostPoint[];
}

/**
 * AgentCostTimeline — Cost over time (sparkline + table)
 * Shows cost points for historical tracking
 */
export function AgentCostTimeline({ timeline }: AgentCostTimelineProps) {
  const total = timeline.reduce((sum, p) => sum + p.cost, 0);
  const avg = timeline.length > 0 ? total / timeline.length : 0;
  const max = timeline.length > 0 ? Math.max(...timeline.map(p => p.cost)) : 0;

  return (
    <div className={cic.cls.spacingVertical}>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <CICText variant="label-xs" className={cic.cls.textMuted}>
            Total
          </CICText>
          <CICText variant="body-lg" weight="semibold">
            ${total.toFixed(4)}
          </CICText>
        </div>
        <div>
          <CICText variant="label-xs" className={cic.cls.textMuted}>
            Average
          </CICText>
          <CICText variant="body-lg" weight="semibold">
            ${avg.toFixed(4)}
          </CICText>
        </div>
        <div>
          <CICText variant="label-xs" className={cic.cls.textMuted}>
            Peak
          </CICText>
          <CICText variant="body-lg" weight="semibold">
            ${max.toFixed(4)}
          </CICText>
        </div>
      </div>

      {timeline.length > 0 ? (
        <div className={`${cic.cls.border} rounded p-3 overflow-x-auto`}>
          <table className="text-xs w-full">
            <thead>
              <tr className={cic.cls.textMuted}>
                <th className="text-left pb-2">Timestamp</th>
                <th className="text-right pb-2">Cost</th>
              </tr>
            </thead>
            <tbody>
              {timeline.slice(-10).reverse().map((point, idx) => (
                <tr key={idx} className={`border-t ${cic.cls.borderColor}`}>
                  <td className="py-1">{new Date(point.timestamp).toLocaleTimeString()}</td>
                  <td className="text-right">${point.cost.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <CICText variant="body-sm" className={cic.cls.textMuted}>
          No cost data available.
        </CICText>
      )}
    </div>
  );
}
