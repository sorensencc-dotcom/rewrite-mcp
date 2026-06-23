import { TaskExecution } from './types.js';
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
export declare class GovernanceGating {
    private highRiskPatterns;
    assessRisk(task: TaskExecution): RiskAssessment;
    private assessOperation;
    private getRiskScore;
    private describeImpact;
    makeDecision(assessment: RiskAssessment, councilVotes?: {
        approve: number;
        reject: number;
        abstain: number;
    }): GovernanceDecision;
    gateExecution(task: TaskExecution): {
        canExecute: boolean;
        reason: string;
    };
}
