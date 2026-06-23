import { PlanningEngine } from "./planning/planning-engine.js";
import { MeeRunEngine } from "./mee-run-engine.js";
import { MeeAutonomousJob, MeePlanningMode, MeeRunFailureContext, MeeHealingPlan } from "./mee-schema.js";
import { MeeSafetyEngine } from "./safety/safety-engine.js";
import { MeeSandboxEngine } from "./safety/sandbox-engine.js";
import { MeeRollbackEngine } from "./safety/rollback-engine.js";
import { MeePatchSynthesizer } from "./mee-synthesizer.js";
import { MeeValidator } from "./mee-validator.js";
import { MeeProposalStore } from "./mee-proposal-store.js";
import { SelfHealingEngine } from "./self-healing/self-healing-engine.js";
import { MeeMemoryStore } from "./mee-memory-store.js";
import { MeeAgentOrchestrator } from "./mee-agent-orchestrator.js";
import { MeeKnowledgeGraph } from "./mee-kg.js";
export interface MeeAutonomousJobStore {
    save(job: MeeAutonomousJob): void;
    get(id: string): MeeAutonomousJob | undefined;
    list(): MeeAutonomousJob[];
}
export interface MeeRunFailureContextStore {
    save(context: MeeRunFailureContext): void;
    get(runId: string): MeeRunFailureContext | undefined;
    getByJob(jobId: string): MeeRunFailureContext | undefined;
    list(): MeeRunFailureContext[];
}
export interface MeeHealingPlanStore {
    save(plan: MeeHealingPlan): void;
    get(id: string): MeeHealingPlan | undefined;
    getByParentJob(jobId: string): MeeHealingPlan | undefined;
    list(): MeeHealingPlan[];
}
export declare class MeeAutonomousEngine {
    private readonly jobs;
    private readonly planning;
    private readonly runs;
    private readonly safety;
    private readonly sandbox;
    private readonly proposals;
    private readonly synth;
    private readonly validator;
    private readonly rollback;
    private readonly failureStore?;
    private readonly selfHealing?;
    private readonly healingPlanStore?;
    private readonly memoryStore?;
    private readonly orchestrator?;
    private readonly kg?;
    constructor(jobs: MeeAutonomousJobStore, planning: PlanningEngine, runs: MeeRunEngine, safety: MeeSafetyEngine, sandbox: MeeSandboxEngine, proposals: MeeProposalStore, synth: MeePatchSynthesizer, validator: MeeValidator, rollback: MeeRollbackEngine, failureStore?: MeeRunFailureContextStore | undefined, selfHealing?: SelfHealingEngine | undefined, healingPlanStore?: MeeHealingPlanStore | undefined, memoryStore?: MeeMemoryStore | undefined, orchestrator?: MeeAgentOrchestrator | undefined, kg?: MeeKnowledgeGraph | undefined);
    createJob(request: string, planningMode?: MeePlanningMode): MeeAutonomousJob;
    startJob(id: string): Promise<MeeAutonomousJob | undefined>;
    executeStep(jobId: string, proposalId: string, workspacePath: string): Promise<void>;
    private handleFailure;
    addMemory(scope: "repo" | "job" | "run", jobId: string | undefined, runId: string | undefined, tags: string[], summary: string, details: string): void;
}
//# sourceMappingURL=mee-autonomous-engine.d.ts.map