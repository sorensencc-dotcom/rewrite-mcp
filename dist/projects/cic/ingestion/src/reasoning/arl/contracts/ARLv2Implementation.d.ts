export interface NewArchitectureComponent {
    name: string;
    purpose: string;
    subsystems: string[];
}
export interface ReasoningEngine {
    engineId: string;
    version: string;
    inputTypes: string[];
    outputType: string;
}
export interface GovernanceHook {
    hookId: string;
    trigger: string;
    action: string;
    escalationPath?: string;
}
export interface OperatorWorkflow {
    workflowId: string;
    steps: string[];
    feedbackChannels: string[];
    approvalRequired: boolean;
}
export interface ARLv2Implementation {
    id: string;
    timestamp: string;
    architectureComponents: NewArchitectureComponent[];
    reasoningEngines: ReasoningEngine[];
    governanceHooks: GovernanceHook[];
    operatorWorkflows: OperatorWorkflow[];
    status: 'in_progress' | 'complete';
}
//# sourceMappingURL=ARLv2Implementation.d.ts.map