export class GovernanceGating {
    constructor() {
        this.highRiskPatterns = {
            shell: ['rm -rf', 'sudo', 'dd if=/dev', 'chmod 777', 'userdel', 'groupdel'],
            file: ['write:/etc/', 'write:/root/', 'write:/sys/', 'delete:.'],
            http: ['http://', 'insecure', 'external'],
            model: ['maxTokens > 8000', 'streaming', 'unconstrained'],
        };
    }
    assessRisk(task) {
        const riskFactors = [];
        let riskLevel = 'LOW';
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
    assessOperation(op) {
        const factors = [];
        let level = 'LOW';
        const opString = JSON.stringify(op).toLowerCase();
        for (const pattern of this.highRiskPatterns[op.type] || []) {
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
            level = Math.max(level, 'MEDIUM');
        }
        if (op.type === 'model' && (op.args?.options?.maxTokens || 0) > 8000) {
            factors.push('High token allocation');
            level = Math.max(level, 'MEDIUM');
        }
        return { level, factors };
    }
    getRiskScore(level) {
        return { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 }[level];
    }
    describeImpact(level, factors) {
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
    makeDecision(assessment, councilVotes) {
        let decision = 'APPROVED';
        if (assessment.riskLevel === 'CRITICAL') {
            if (!councilVotes) {
                decision = 'PENDING';
            }
            else if (councilVotes.approve > councilVotes.reject) {
                decision = 'APPROVED';
            }
            else {
                decision = 'REJECTED';
            }
        }
        else if (assessment.riskLevel === 'HIGH') {
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
    gateExecution(task) {
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
//# sourceMappingURL=governance-gating.js.map