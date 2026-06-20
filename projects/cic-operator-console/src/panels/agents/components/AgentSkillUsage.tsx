import { CICText, CICGrid, CICStat } from '../../../components/cic-primitives';
import { cic } from '../../../tokens/cic-tokens';
import type { SkillUsageEntry } from '../types';

interface AgentSkillUsageProps {
  skills: SkillUsageEntry[];
}

/**
 * AgentSkillUsage — Skill invocation history
 * Shows frequency, average cost, success rate
 */
export function AgentSkillUsage({ skills }: AgentSkillUsageProps) {
  if (!skills.length) {
    return (
      <CICText variant="body-sm" className={cic.cls.textMuted}>
        No skills invoked yet.
      </CICText>
    );
  }

  const totalInvocations = skills.reduce((sum, s) => sum + s.count, 0);
  const totalCost = skills.reduce((sum, s) => sum + s.avgCost * s.count, 0);
  const avgSuccessRate = skills.length > 0
    ? skills.reduce((sum, s) => sum + s.successRate, 0) / skills.length
    : 0;

  return (
    <div className={cic.cls.spacingVertical}>
      <div>
        <CICText variant="label-sm" className="mb-4">
          Summary
        </CICText>
        <CICGrid cols={3} gap={4}>
          <CICStat
            label="Total Invocations"
            value={totalInvocations}
            tone="accent"
          />
          <CICStat
            label="Total Cost"
            value={`$${totalCost.toFixed(4)}`}
            tone="accent"
          />
          <CICStat
            label="Avg Success Rate"
            value={`${(avgSuccessRate * 100).toFixed(1)}%`}
            tone={avgSuccessRate >= 0.95 ? 'success' : avgSuccessRate >= 0.8 ? 'warning' : 'error'}
          />
        </CICGrid>
      </div>

      <div className="mt-4">
        <CICText variant="label-sm" className="mb-2">
          By Skill
        </CICText>
        <div className={`${cic.cls.border} rounded overflow-x-auto max-h-64 overflow-y-auto`}>
          <table className="text-xs w-full">
            <thead className={cic.cls.bgMuted}>
              <tr>
                <th className="text-left p-2">Skill</th>
                <th className="text-right p-2">Count</th>
                <th className="text-right p-2">Avg Cost</th>
                <th className="text-right p-2">Success Rate</th>
              </tr>
            </thead>
            <tbody>
              {skills
                .slice()
                .sort((a, b) => b.count - a.count)
                .map((skill, idx) => (
                  <tr key={idx} className={`border-t ${cic.cls.borderColor}`}>
                    <td className="p-2">{skill.skill}</td>
                    <td className="p-2 text-right">{skill.count}</td>
                    <td className="p-2 text-right">${skill.avgCost.toFixed(4)}</td>
                    <td className="p-2 text-right">{(skill.successRate * 100).toFixed(1)}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
