"use strict";
// File: projects/cic/src/mee/mee-capability-expansion-engine.ts | Date: 2026-06-04 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeeCapabilityExpansionEngine = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
class MeeCapabilityExpansionEngine {
    detectGaps(kg) {
        const gaps = [];
        const safetyRisks = kg.getSafetyRisks();
        if (safetyRisks.length > 0) {
            gaps.push({
                id: `cap-gap-${node_crypto_1.default.randomUUID()}`,
                title: "Hardened Sandboxed Safety Guardrails",
                description: "Autonomous execution sandbox requires runtime isolation capability to prevent system call violations.",
                requirements: ["isolate-exec", "audit-calls"],
                suggestedAgents: ["isolation-agent-1"],
                suggestedSubsystems: ["sandbox-isolation-layer"],
                status: "proposed",
                timestamp: Date.now()
            });
        }
        // Default gap to ensure engine is always functional
        if (gaps.length === 0) {
            gaps.push({
                id: `cap-gap-${node_crypto_1.default.randomUUID()}`,
                title: "Autonomous Knowledge Ingestion Subsystem",
                description: "Enables real-time ingestion of newly generated skills and templates directly into CKG namespaces.",
                requirements: ["ckg-hot-reload", "dynamic-indexing"],
                suggestedAgents: ["ingest-agent-1"],
                suggestedSubsystems: ["ckg-realtime-listener"],
                status: "proposed",
                timestamp: Date.now()
            });
        }
        return gaps;
    }
    generateProposal(spec) {
        const proposalId = `prop-expansion-${node_crypto_1.default.randomUUID()}`;
        const targetFile = "projects/cic/src/mee/expanded-capabilities.ts";
        const patchContent = `// File: ${targetFile} | Date: ${new Date().toISOString().substring(0, 10)} | v1.0.0
// Expanded Capability Blueprint: ${spec.title}
// Description: ${spec.description}

export const CapabilityMetadata = {
  id: "${spec.id}",
  title: "${spec.title}",
  requirements: ${JSON.stringify(spec.requirements)},
  suggestedAgents: ${JSON.stringify(spec.suggestedAgents)},
  suggestedSubsystems: ${JSON.stringify(spec.suggestedSubsystems)}
};

export class CapabilityRegistry {
  public static isLoaded() {
    return true;
  }
}
`;
        const patches = [
            {
                path: targetFile,
                type: "create",
                content: patchContent
            }
        ];
        const proposal = {
            id: proposalId,
            title: `Expand Capability: ${spec.title}`,
            status: "pending",
            filesCreated: [targetFile],
            planSummary: `Deploy capability spec expansion for: ${spec.description}. Deploying code skeleton in ${targetFile}.`,
            timestamp: Date.now(),
            // Attach spec as payload trigger metadata
            trigger: {
                id: spec.id,
                type: "capability_gap_expansion",
                payload: { spec },
                timestamp: Date.now()
            }
        };
        // Store patches temporarily on the proposal using a non-schema helper field or synthesize it
        proposal.patches = patches;
        return proposal;
    }
    async applyExpansion(spec, kg, baseDir = process.cwd()) {
        const targetFile = "projects/cic/src/mee/expanded-capabilities.ts";
        const fullPath = node_path_1.default.resolve(baseDir, targetFile);
        // 1. Write File
        const patchContent = `// File: ${targetFile} | Date: ${new Date().toISOString().substring(0, 10)} | v1.0.0
// Expanded Capability Blueprint: ${spec.title}
export const CapabilityMetadata = {
  id: "${spec.id}",
  title: "${spec.title}",
  requirements: ${JSON.stringify(spec.requirements)},
  status: "integrated"
};
`;
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(fullPath), { recursive: true });
        node_fs_1.default.writeFileSync(fullPath, patchContent, "utf8");
        // 2. Update CKG Graph Node if KG available
        if (kg) {
            const store = kg.store;
            if (store) {
                store.appendNode({
                    id: `capability:${spec.id}`,
                    type: "capability",
                    name: spec.title,
                    meta: { requirements: spec.requirements, description: spec.description }
                });
            }
        }
        // 3. Update Docs
        const systemDocPath = node_path_1.default.join(baseDir, "docs", "cic", "CIC_SYSTEM.md");
        if (node_fs_1.default.existsSync(systemDocPath)) {
            try {
                let content = node_fs_1.default.readFileSync(systemDocPath, "utf8");
                const appendMarker = "## 19. Capability Expansion Registry";
                const logEntry = `\n### Capability Integration [${new Date().toISOString().substring(0, 10)}]\n- **ID:** ${spec.id}\n- **Title:** ${spec.title}\n- **Requirements:** ${spec.requirements.join(", ")}\n`;
                if (content.includes(appendMarker)) {
                    content = content.replace(appendMarker, `${appendMarker}\n${logEntry}`);
                }
                else {
                    content += `\n\n${appendMarker}\n${logEntry}`;
                }
                node_fs_1.default.writeFileSync(systemDocPath, content, "utf8");
            }
            catch (err) {
                console.error("Failed to update system docs for capability expansion:", err);
            }
        }
    }
}
exports.MeeCapabilityExpansionEngine = MeeCapabilityExpansionEngine;
//# sourceMappingURL=mee-capability-expansion-engine.js.map