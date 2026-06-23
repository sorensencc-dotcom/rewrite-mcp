import { multiStageOrchestrator } from "../../pms/v2/multi-stage.js";
import { metricsCollector } from "../../reasoning/metrics-collector.js";
import { specRegistry } from "../../cic/control-plane/spec-registry.js";
import { getTelemetrySink } from "../../cic/control-plane/telemetry-sink.js";
export class ExtractorChain {
    constructor() {
        this.chain = [];
        this.pms = {
            requestPrompt: async (stage, context) => {
                return multiStageOrchestrator.requestPrompt(stage, context);
            }
        };
    }
    add(extractor) {
        this.chain.push(extractor);
        return this;
    }
    async run(rawText, metadata = {}) {
        if (!rawText) {
            metricsCollector.recordIngestionError();
            throw new Error("Invalid raw text for extractor chain execution");
        }
        const docType = metadata.docType || "bibliography";
        const sourceFormat = metadata.sourceFormat || "ris";
        const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const tenantId = metadata.tenantId || "default";
        const region = metadata.region || "us-east-1";
        // 1. Evaluate Instinct Heuristics & Emit Instinct Telemetry
        const instincts = specRegistry.evaluateInstincts("documentary_ingest", docType, sourceFormat, tenantId, region);
        const activeInstincts = specRegistry.getInstincts().filter(i => i.trigger.pipeline === "documentary_ingest" &&
            i.trigger.when.doc_type === docType &&
            i.trigger.when.source_format_in.includes(sourceFormat));
        for (const instinct of activeInstincts) {
            const skillsSelected = this.chain.map(extractor => {
                const name = extractor.constructor.name;
                let skillLabel = name;
                if (name === "SemanticExtractor")
                    skillLabel = "extract_semantic_text";
                else if (name === "RelationshipExtractor")
                    skillLabel = "extract_entity_relationships";
                else if (name === "TopicExtractor")
                    skillLabel = "extract_thematic_topics";
                else if (name === "ImageAnalyzer")
                    skillLabel = "extract_image_analysis";
                else if (name === "RISMetadataExtractor")
                    skillLabel = "extract_ris_metadata";
                return skillLabel;
            }).filter(s => !instincts.avoid.includes(s));
            void getTelemetrySink().recordInstinct({
                runId,
                pipeline: "documentary_ingest",
                stage: "evidence_pack",
                instinctName: instinct.name,
                instinctVersion: instinct.version,
                tenantId,
                region,
                firedAt: new Date().toISOString(),
                skillsSelected,
                skillsAvoided: instincts.avoid,
                pipelineOutcome: "success"
            });
        }
        let context = {
            raw: rawText,
            pmsEngine: this.pms,
            doc_type: docType,
            source_format: sourceFormat
        };
        const results = [];
        const latencies = {};
        const chainStart = Date.now();
        const skillsUsed = [];
        let pipelineOutcome = "success";
        let driftDelta = metadata.driftDelta !== undefined ? metadata.driftDelta : -0.05;
        try {
            for (const extractor of this.chain) {
                const name = extractor.constructor.name;
                // Map constructor names to skill labels
                let skillLabel = "";
                let skillVersion = "1.0.0";
                if (name === "SemanticExtractor")
                    skillLabel = "extract_semantic_text";
                else if (name === "RelationshipExtractor")
                    skillLabel = "extract_entity_relationships";
                else if (name === "TopicExtractor")
                    skillLabel = "extract_thematic_topics";
                else if (name === "ImageAnalyzer")
                    skillLabel = "extract_image_analysis";
                else if (name === "RISMetadataExtractor") {
                    skillLabel = "extract_ris_metadata";
                    skillVersion = "1.2.0";
                }
                else
                    skillLabel = name;
                // Skip if this skill/extractor is explicitly avoided by instincts
                if (instincts.avoid.includes(skillLabel)) {
                    console.log(`[ExtractorChain] [Instinct Overwrite] Avoiding skill '${skillLabel}' for docType '${docType}' format '${sourceFormat}'`);
                    continue;
                }
                const startedAt = new Date();
                const inputSizeBytes = Buffer.byteLength(JSON.stringify(context));
                let outcome = "success";
                let errorType;
                let errorMessageSnippet;
                let outputSizeBytes = null;
                try {
                    const tStart = Date.now();
                    const output = await extractor.extract(context);
                    const duration = Date.now() - tStart;
                    if (name === "SemanticExtractor")
                        latencies.semantic = duration;
                    else if (name === "RelationshipExtractor")
                        latencies.relationship = duration;
                    else if (name === "TopicExtractor")
                        latencies.topic = duration;
                    else if (name === "ReasoningExtractor")
                        latencies.reasoning = duration;
                    results.push(output);
                    skillsUsed.push(skillLabel);
                    outputSizeBytes = Buffer.byteLength(JSON.stringify(output));
                    // Thread context down the chain to achieve multi-pass contextual enrichment
                    context = {
                        ...context,
                        ...output,
                        pmsEngine: this.pms
                    };
                }
                catch (err) {
                    outcome = "failure";
                    errorType = err.message.includes("timeout") ? "timeout" : "validation_error";
                    errorMessageSnippet = err.message.slice(0, 200);
                    throw err;
                }
                finally {
                    const finishedAt = new Date();
                    const activeRules = specRegistry.getRules()
                        .filter(r => r.target.pipeline === "documentary_ingest" && r.target.stage === "evidence_pack")
                        .map(r => r.name);
                    const activeHooks = specRegistry.getHooks()
                        .filter(h => h.phase === "before_pipeline_commit")
                        .map(h => h.name);
                    const matchingInstinct = activeInstincts.find(i => i.logic.routing_policy.then.prefer_skills?.includes(skillLabel) ||
                        i.logic.routing_policy.then.avoid_skills?.includes(skillLabel)) || activeInstincts[0];
                    void getTelemetrySink().recordSkill({
                        runId,
                        pipeline: "documentary_ingest",
                        stage: "evidence_pack",
                        skillName: skillLabel,
                        skillVersion,
                        tenantId,
                        region,
                        startedAt: startedAt.toISOString(),
                        finishedAt: finishedAt.toISOString(),
                        latencyMs: finishedAt.getTime() - startedAt.getTime(),
                        inputSizeBytes,
                        outputSizeBytes,
                        outcome,
                        errorType,
                        errorMessageSnippet,
                        instinctName: matchingInstinct?.name,
                        instinctVersion: matchingInstinct?.version,
                        rulesEnforced: activeRules,
                        hooksFired: activeHooks
                    });
                }
            }
            const chainDuration = Date.now() - chainStart;
            metricsCollector.recordIngestion(chainDuration, latencies);
        }
        catch (err) {
            pipelineOutcome = "failure";
            metricsCollector.recordIngestionError();
            void getTelemetrySink().enrichInstinct(runId, {
                pipelineOutcome,
                driftDelta: 0.1,
                latencyDeltaMs: Date.now() - chainStart - 800
            });
            throw err;
        }
        const payload = {
            chain_execution: "completed",
            timestamp: new Date().toISOString(),
            results,
            final_payload: context
        };
        // 2. Execute Hooks (e.g. enforce_schema_before_commit)
        await specRegistry.runHooks("before_pipeline_commit", {
            evidence_pack: payload,
            runId,
            pipeline: "documentary_ingest",
            stage: "evidence_pack",
            tenantId,
            region
        });
        // 3. Validate Declarative Rules (e.g. no_nondeterministic_in_evidence_pack)
        specRegistry.validateRules("documentary_ingest", "evidence_pack", {
            skills_used: skillsUsed,
            runId,
            tenantId,
            region
        });
        // 4. Enrich Instinct Telemetry Post-Run
        const totalLatency = Date.now() - chainStart;
        const latencyDeltaMs = totalLatency - 800; // actual vs 800ms baseline
        void getTelemetrySink().enrichInstinct(runId, {
            pipelineOutcome,
            driftDelta,
            latencyDeltaMs
        });
        return payload;
    }
}
//# sourceMappingURL=extractor-chain.js.map