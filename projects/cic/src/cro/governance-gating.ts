import { TaskExecution, AdapterOperation } from './types.js';

export interface RiskAssessment {
  taskId: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskFactors: string[];
  requiresApproval: boolean;
  estimatedImpact: string;
}

export interface GovernanceDecision {
  taskId: string;
  decision: 'APPROVED' | 'REJECTED' | 'PENDING' | 'DEFERRED';
  councilVotes?: {
    approve: number;
    reject: number;
    abstain: number;
  };
  reasoning?: string;
  approvedBy?: string;
  timestamp: string;
}

export class GovernanceGating {
  private highRiskPatterns = {
    shell: ['rm -rf', 'sudo', 'dd if=/dev', 'chmod 777', 'userdel', 'groupdel'],
    file: ['write:/etc/', 'write:/root/', 'write:/sys/', 'delete:.'],
    http: ['http://', 'insecure', 'external'],
    model: ['maxTokens > 8000', 'streaming', 'unconstrained'],
  };

  assessRisk(task: TaskExecution): RiskAssessment {
    const riskFactors: string[] = [];
    let riskLevel: RiskAssessment['riskLevel'] = 'LOW';

    if (!task.adapterOps || task.adapterOps.length === 0) {
      return {
        taskId: task.taskId,
        riskLevel: 'LOW',
        riskFactors: [],
        requiresApproval: false,
        estimatedImpact: 'Minimal - no operations',
      };
    }

    for (const op of task.adapterOps) {
      const opRisk = this.assessOperation(op);
      if (opRisk.level !== 'LOW') {
        riskFactors.push(...opRisk.factors);
        if (this.getRiskScore(opRisk.level) > this.getRiskScore(riskLevel)) {
          riskLevel = opRisk.level;
        }
      }
    }

    return {
      taskId: task.taskId,
      riskLevel,
      riskFactors,
      requiresApproval: riskLevel !== 'LOW',
      estimatedImpact: this.describeImpact(riskLevel, riskFactors),
    };
  }

  private assessOperation(
    op: AdapterOperation
  ): { level: RiskAssessment['riskLevel']; factors: string[] } {
    const factors: string[] = [];
    let level: RiskAssessment['riskLevel'] = 'LOW';

    const opString = JSON.stringify(op).toLowerCase();

    for (const pattern of this.highRiskPatterns[op.type as keyof typeof this.highRiskPatterns] || []) {
      if (opString.includes(pattern.toLowerCase())) {
        factors.push(`Contains dangerous pattern: ${pattern}`);
        level = 'CRITICAL';
      }
    }

    if (op.type === 'shell' && op.args?.command === 'dd') {
      factors.push('Direct block device access');
      level = 'CRITICAL';
    }

    if (op.type === 'file' && op.args?.path?.includes('/etc/')) {
      factors.push('System configuration file access');
      level = 'HIGH';
    }

    if (op.type === 'http' && !op.args?.url?.includes('https')) {
      factors.push('Unencrypted HTTP request');
      level = Math.max(level as any, 'MEDIUM' as any) as any;
    }

    if (op.type === 'model' && (op.args?.options?.maxTokens || 0) > 8000) {
      factors.push('High token allocation');
      level = Math.max(level as any, 'MEDIUM' as any) as any;
    }

    return { level, factors };
  }

  private getRiskScore(level: RiskAssessment['riskLevel']): number {
    return { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 }[level];
  }

  private describeImpact(level: RiskAssessment['riskLevel'], factors: string[]): string {
    if (level === 'CRITICAL') {
      return `CRITICAL: System integrity at risk. ${factors.join('; ')}`;
    }
    if (level === 'HIGH') {
      return `HIGH: Significant system changes. ${factors.join('; ')}`;
    }
    if (level === 'MEDIUM') {
      return `MEDIUM: Potential side effects. ${factors.join('; ')}`;
    }
    return 'LOW: Minimal risk to system';
  }

  makeDecision(
    assessment: RiskAssessment,
    councilVotes?: { approve: number; reject: number; abstain: number }
  ): GovernanceDecision {
    let decision: GovernanceDecision['decision'] = 'APPROVED';

    if (assessment.riskLevel === 'CRITICAL') {
      if (!councilVotes) {
        decision = 'PENDING';
      } else if (councilVotes.approve > councilVotes.reject) {
        decision = 'APPROVED';
      } else {
        decision = 'REJECTED';
      }
    } else if (assessment.riskLevel === 'HIGH') {
      if (councilVotes && councilVotes.reject > 0) {
        decision = 'REJECTED';
      }
    }

    return {
      taskId: assessment.taskId,
      decision,
      councilVotes,
      reasoning: `Risk level: ${assessment.riskLevel}`,
      timestamp: new Date().toISOString(),
    };
  }

  gateExecution(task: TaskExecution): { canExecute: boolean; reason: string } {
    const assessment = this.assessRisk(task);

    if (assessment.riskLevel === 'CRITICAL') {
      return {
        canExecute: false,
        reason: `GATED: Critical risk detected. ${assessment.estimatedImpact}. Requires governance council approval.`,
      };
    }

    if (assessment.riskLevel === 'HIGH') {
      return {
        canExecute: true,
        reason: `WARNING: High risk detected. ${assessment.estimatedImpact}. Logged for governance audit.`,
      };
    }

    return {
      canExecute: true,
      reason: `Approved: ${assessment.estimatedImpact}`,
    };
  }
}
