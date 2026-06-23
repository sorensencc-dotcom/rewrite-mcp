export interface SkillSpec {
    name: string;
    version: string;
    type: string;
    io: {
        input_schema: string;
        output_schema: string;
    };
    determinism: {
        is_pure: boolean;
        uses_network: boolean;
        uses_llm: boolean;
    };
    performance: {
        expected_latency_ms: number;
        cost_tier: string;
    };
    safety: {
        requires_guard: boolean;
        allowed_regions: string[];
        sensitivity_level: string;
    };
    routing: {
        tags: string[];
        preferred_models: string[];
    };
}
export interface InstinctSpec {
    name: string;
    version: string;
    trigger: {
        pipeline: string;
        when: {
            doc_type: string;
            source_format_in: string[];
        };
    };
    logic: {
        routing_policy: {
            if: string;
            then: {
                prefer_skills: string[];
                avoid_skills: string[];
            };
            else: {
                prefer_skills: string[];
                avoid_skills?: string[];
            };
        };
    };
    constraints: {
        max_skill_fanout: number;
        max_depth: number;
        allowed_cost_tiers: string[];
    };
}
export interface HookSpec {
    name: string;
    version: string;
    phase: string;
    scope: {
        pipeline: string;
    };
    behavior: {
        action: string;
        params: Record<string, any>;
    };
    failure_policy: string;
    idempotent: boolean;
    priority: number;
}
export interface RuleSpec {
    name: string;
    version: string;
    target: {
        pipeline: string;
        stage: string;
    };
    constraint_type: string;
    expression: string;
    enforcement: string;
}
export interface SpecViolation {
    timestamp: string;
    type: "rule" | "hook" | "instinct" | "safety";
    name: string;
    message: string;
    severity: "hard" | "soft";
    context?: any;
}
export declare class SpecRegistry {
    private specsDir;
    private skills;
    private instincts;
    private hooks;
    private rules;
    private violations;
    constructor(specsDir?: string);
    loadAll(): void;
    private registerDefaultExtractorSkills;
    getSkills(): SkillSpec[];
    getInstincts(): InstinctSpec[];
    getHooks(): HookSpec[];
    getRules(): RuleSpec[];
    getViolations(): SpecViolation[];
    queryViolations(filter?: Record<string, any>): SpecViolation[];
    clearViolations(): void;
    registerViolation(violation: Omit<SpecViolation, "timestamp">): void;
    evaluateInstincts(pipeline: string, docType: string, sourceFormat: string, tenantId?: string, region?: string): {
        prefer: string[];
        avoid: string[];
    };
    /**
     * Triggers hook pipelines for specific execution phases.
     */
    runHooks(phase: string, context: any): Promise<void>;
    /**
     * Validates declarative rules for specific targets.
     */
    validateRules(pipeline: string, stage: string, context: any): void;
}
export declare const specRegistry: SpecRegistry;
//# sourceMappingURL=spec-registry.d.ts.map