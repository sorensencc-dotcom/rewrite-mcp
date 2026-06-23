// File: projects/cic/src/cic/control-plane/spec-registry.ts | Date: 2026-06-01 | v1.5.0
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import YAML from "yaml";
import { patchLoader } from "./patch-loader.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class SpecRegistry {
    constructor(specsDir = path.resolve(__dirname, "../../../cic-specs")) {
        this.skills = new Map();
        this.instincts = new Map();
        this.hooks = new Map();
        this.rules = new Map();
        this.violations = [];
        this.specsDir = specsDir;
    }
    loadAll() {
        try {
            if (!fs.existsSync(this.specsDir)) {
                fs.mkdirSync(this.specsDir, { recursive: true });
            }
            const files = fs.readdirSync(this.specsDir).filter(f => f.endsWith(".yaml") || f.endsWith(".yml"));
            for (const file of files) {
                const fullPath = path.join(this.specsDir, file);
                const raw = fs.readFileSync(fullPath, "utf-8");
                const parsed = YAML.parse(raw);
                if (!parsed || typeof parsed !== "object")
                    continue;
                // Route by spec signature/type
                if (parsed.name && parsed.version) {
                    if (file.includes("skill") || parsed.io || parsed.determinism) {
                        this.skills.set(parsed.name, parsed);
                    }
                    else if (file.includes("instinct") || parsed.logic) {
                        this.instincts.set(parsed.name, parsed);
                    }
                    else if (file.includes("hook") || parsed.phase) {
                        this.hooks.set(parsed.name, parsed);
                    }
                    else if (file.includes("rule") || parsed.target) {
                        this.rules.set(parsed.name, parsed);
                    }
                }
            }
            // Register default native Extractor wrapper skills to fulfill wrapping requirements
            this.registerDefaultExtractorSkills();
            // Load violations from disk if exists
            try {
                const logDir = path.resolve(__dirname, "../../../data/telemetry");
                const filePath = path.join(logDir, "violations.jsonl");
                if (fs.existsSync(filePath)) {
                    const rawLines = fs.readFileSync(filePath, "utf-8").trim().split("\n");
                    this.violations = rawLines
                        .filter(l => l.trim() !== "")
                        .map(l => JSON.parse(l));
                }
            }
            catch (err) {
                console.warn(`[SpecRegistry] Failed to restore violations from disk:`, err.message);
            }
            console.log(`[SpecRegistry] Loaded: ${this.skills.size} Skills, ${this.instincts.size} Instincts, ${this.hooks.size} Hooks, ${this.rules.size} Rules.`);
        }
        catch (err) {
            console.error(`[SpecRegistry] Failed to load specs:`, err.message);
        }
    }
    registerDefaultExtractorSkills() {
        const extractors = [
            { name: "SemanticExtractor", label: "extract_semantic_text", isPure: true },
            { name: "RelationshipExtractor", label: "extract_entity_relationships", isPure: true },
            { name: "TopicExtractor", label: "extract_thematic_topics", isPure: true },
            { name: "TextExtractor", label: "extract_raw_text", isPure: true },
            { name: "ImageAnalyzer", label: "extract_image_analysis", isPure: false, usesLLM: true }
        ];
        for (const ext of extractors) {
            if (!this.skills.has(ext.label)) {
                this.skills.set(ext.label, {
                    name: ext.label,
                    version: "1.0.0",
                    type: "extractor",
                    io: {
                        input_schema: "historical_document_v1",
                        output_schema: `${ext.label}_output_v1`
                    },
                    determinism: {
                        is_pure: ext.isPure,
                        uses_network: false,
                        uses_llm: ext.usesLLM ?? false
                    },
                    performance: {
                        expected_latency_ms: ext.isPure ? 120 : 1500,
                        cost_tier: ext.isPure ? "low" : "medium"
                    },
                    safety: {
                        requires_guard: false,
                        allowed_regions: ["us-east-1", "eu-central-1"],
                        sensitivity_level: "normal"
                    },
                    routing: {
                        tags: [ext.label, "extractor"],
                        preferred_models: ext.usesLLM ? ["gemini-2.5-flash"] : []
                    }
                });
            }
        }
    }
    getSkills() {
        return Array.from(this.skills.values());
    }
    getInstincts() {
        return Array.from(this.instincts.values());
    }
    getHooks() {
        return Array.from(this.hooks.values());
    }
    getRules() {
        return Array.from(this.rules.values());
    }
    getViolations() {
        return this.violations;
    }
    queryViolations(filter = {}) {
        let result = [...this.violations];
        if (filter.pipeline) {
            result = result.filter(e => e.context?.pipeline === filter.pipeline);
        }
        if (filter.tenantId) {
            result = result.filter(e => e.context?.tenantId === filter.tenantId);
        }
        if (filter.region) {
            result = result.filter(e => e.context?.region === filter.region);
        }
        const limit = filter.limit ? Number(filter.limit) : 100;
        return result.slice(-limit).reverse();
    }
    clearViolations() {
        this.violations = [];
        try {
            const logDir = path.resolve(__dirname, "../../../data/telemetry");
            const filePath = path.join(logDir, "violations.jsonl");
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        catch (err) {
            console.warn(`[SpecRegistry] Failed to clear violations on disk:`, err.message);
        }
    }
    registerViolation(violation) {
        const entry = {
            ...violation,
            timestamp: new Date().toISOString()
        };
        this.violations.push(entry);
        console.warn(`[SpecRegistry] [VIOLATION] [${entry.type.toUpperCase()}] (${entry.severity}): ${entry.message}`);
        try {
            const logDir = path.resolve(__dirname, "../../../data/telemetry");
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            const filePath = path.join(logDir, "violations.jsonl");
            fs.appendFileSync(filePath, JSON.stringify(entry) + "\n", "utf-8");
        }
        catch (err) {
            console.error(`[SpecRegistry] Failed to log violation to disk:`, err.message);
        }
    }
    evaluateInstincts(pipeline, docType, sourceFormat, tenantId = "default", region = "us-east-1") {
        const prefer = new Set();
        const avoid = new Set();
        // Load active and scoped canary patches
        const activePatches = patchLoader.listPatches("active");
        const canaryPatches = patchLoader.listPatches("canary").filter(p => {
            const regionMatch = p.scope.regions.includes(region) || p.scope.regions.includes("*");
            const tenantMatch = p.scope.tenants.includes(tenantId) || p.scope.tenants.includes("*");
            return regionMatch && tenantMatch;
        });
        const allPatches = [...activePatches, ...canaryPatches];
        for (const instinct of this.instincts.values()) {
            if (instinct.trigger.pipeline !== pipeline)
                continue;
            // Safe deep-clone of the instinct definition to prevent baseline mutation
            const resolvedInstinct = JSON.parse(JSON.stringify(instinct));
            // Apply any matching patches for this instinct
            const matchingPatches = allPatches.filter(p => p.instinct === resolvedInstinct.name);
            for (const patch of matchingPatches) {
                if (patch.change.trigger?.when?.source_format_in) {
                    resolvedInstinct.trigger.when.source_format_in = patch.change.trigger.when.source_format_in;
                }
                if (patch.change.routing_policy?.prefer_skills) {
                    resolvedInstinct.logic.routing_policy.then.prefer_skills = patch.change.routing_policy.prefer_skills;
                }
                if (patch.change.routing_policy?.avoid_skills) {
                    resolvedInstinct.logic.routing_policy.then.avoid_skills = patch.change.routing_policy.avoid_skills;
                }
                if (patch.change.routing_policy?.if) {
                    resolvedInstinct.logic.routing_policy.if = patch.change.routing_policy.if;
                }
            }
            const trigger = resolvedInstinct.trigger.when;
            const docTypeMatch = trigger.doc_type === docType;
            const formatMatch = trigger.source_format_in.includes(sourceFormat);
            if (docTypeMatch && formatMatch) {
                const policy = resolvedInstinct.logic.routing_policy;
                // Simple expression evaluator
                const cond = policy.if.replace("doc.source_format", `'${sourceFormat}'`);
                const isTrue = eval(cond);
                if (isTrue) {
                    policy.then.prefer_skills.forEach(s => prefer.add(s));
                    policy.then.avoid_skills.forEach(s => avoid.add(s));
                }
                else if (policy.else) {
                    policy.else.prefer_skills.forEach(s => prefer.add(s));
                    policy.else.avoid_skills?.forEach(s => avoid.add(s));
                }
            }
        }
        return {
            prefer: Array.from(prefer),
            avoid: Array.from(avoid)
        };
    }
    /**
     * Triggers hook pipelines for specific execution phases.
     */
    async runHooks(phase, context) {
        const activeHooks = Array.from(this.hooks.values())
            .filter(h => h.phase === phase)
            .sort((a, b) => b.priority - a.priority); // Higher priority runs first
        for (const hook of activeHooks) {
            try {
                console.log(`[SpecRegistry] Running hook '${hook.name}' for phase '${phase}'`);
                if (hook.behavior.action === "validate_schema") {
                    const { target_stage, schema } = hook.behavior.params;
                    const stageData = context[target_stage];
                    if (!stageData) {
                        throw new Error(`Target stage '${target_stage}' missing data to validate.`);
                    }
                    // Mock schema validation against expected properties
                    if (schema === "evidence_pack_v2") {
                        const hasRequired = Array.isArray(stageData.results) || stageData.chain_execution === "completed";
                        if (!hasRequired) {
                            throw new Error(`Schema mismatch on evidence_pack: missing 'results' array.`);
                        }
                    }
                }
                else {
                    throw new Error(`Unrecognized or faulty hook action '${hook.behavior.action}'`);
                }
            }
            catch (err) {
                this.registerViolation({
                    type: "hook",
                    name: hook.name,
                    message: `Hook failed: ${err.message}`,
                    severity: hook.failure_policy === "fail_pipeline" ? "hard" : "soft",
                    context: {
                        phase,
                        error: err.message,
                        runId: context.runId,
                        pipeline: context.pipeline || "documentary_ingest",
                        stage: context.stage || "evidence_pack",
                        tenantId: context.tenantId || "default",
                        region: context.region || "us-east-1"
                    }
                });
                if (hook.failure_policy === "fail_pipeline") {
                    throw new Error(`[SpecRegistry] [HARD GATING] Pipeline aborted due to hook '${hook.name}' violation.`);
                }
            }
        }
    }
    /**
     * Validates declarative rules for specific targets.
     */
    validateRules(pipeline, stage, context) {
        const activeRules = Array.from(this.rules.values()).filter(r => r.target.pipeline === pipeline && r.target.stage === stage);
        for (const rule of activeRules) {
            try {
                if (rule.name === "no_nondeterministic_in_evidence_pack") {
                    // Check context for any used skills
                    const skillsInPack = context.skills_used || [];
                    for (const skillName of skillsInPack) {
                        const spec = this.skills.get(skillName);
                        if (spec) {
                            const isDeterministic = spec.determinism.is_pure === true &&
                                spec.determinism.uses_llm === false &&
                                spec.determinism.uses_network === false;
                            if (!isDeterministic) {
                                throw new Error(`Non-deterministic skill '${skillName}' violates rule purity requirements in stage '${stage}'`);
                            }
                        }
                    }
                }
            }
            catch (err) {
                const severity = rule.enforcement === "hard" ? "hard" : "soft";
                this.registerViolation({
                    type: "rule",
                    name: rule.name,
                    message: err.message,
                    severity,
                    context: {
                        pipeline,
                        stage,
                        runId: context.runId,
                        tenantId: context.tenantId || "default",
                        region: context.region || "us-east-1"
                    }
                });
                if (severity === "hard") {
                    throw new Error(`[SpecRegistry] [HARD GATING] Pipeline blocked by rule constraint: ${err.message}`);
                }
            }
        }
    }
}
export const specRegistry = new SpecRegistry();
specRegistry.loadAll();
//# sourceMappingURL=spec-registry.js.map