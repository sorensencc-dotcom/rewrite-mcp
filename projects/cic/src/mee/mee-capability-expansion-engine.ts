// File: projects/cic/src/mee/mee-capability-expansion-engine.ts | Date: 2026-06-04 | v1.0.0

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { MeeKnowledgeGraph } from "./mee-kg.js";
import { MeeCapabilitySpec, PhaseProposal, PhasePatch } from "./mee-schema.js";

export class MeeCapabilityExpansionEngine {
  detectGaps(kg: MeeKnowledgeGraph): MeeCapabilitySpec[] {
    const gaps: MeeCapabilitySpec[] = [];
    const safetyRisks = kg.getSafetyRisks();

    if (safetyRisks.length > 0) {
      gaps.push({
        id: `cap-gap-${crypto.randomUUID()}`,
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
        id: `cap-gap-${crypto.randomUUID()}`,
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

  generateProposal(spec: MeeCapabilitySpec): PhaseProposal {
    const proposalId = `prop-expansion-${crypto.randomUUID()}`;
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

    const patches: PhasePatch[] = [
      {
        path: targetFile,
        type: "create",
        content: patchContent
      }
    ];

    const proposal: PhaseProposal = {
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
    (proposal as any).patches = patches;

    return proposal;
  }

  async applyExpansion(
    spec: MeeCapabilitySpec, 
    kg?: MeeKnowledgeGraph, 
    baseDir: string = process.cwd()
  ): Promise<void> {
    const targetFile = "projects/cic/src/mee/expanded-capabilities.ts";
    const fullPath = path.resolve(baseDir, targetFile);

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
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, patchContent, "utf8");

    // 2. Update CKG Graph Node if KG available
    if (kg) {
      const store = (kg as any).store;
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
    const systemDocPath = path.join(baseDir, "docs", "cic", "CIC_SYSTEM.md");
    if (fs.existsSync(systemDocPath)) {
      try {
        let content = fs.readFileSync(systemDocPath, "utf8");
        const appendMarker = "## 19. Capability Expansion Registry";
        const logEntry = `\n### Capability Integration [${new Date().toISOString().substring(0, 10)}]\n- **ID:** ${spec.id}\n- **Title:** ${spec.title}\n- **Requirements:** ${spec.requirements.join(", ")}\n`;
        
        if (content.includes(appendMarker)) {
          content = content.replace(appendMarker, `${appendMarker}\n${logEntry}`);
        } else {
          content += `\n\n${appendMarker}\n${logEntry}`;
        }
        fs.writeFileSync(systemDocPath, content, "utf8");
      } catch (err) {
        console.error("Failed to update system docs for capability expansion:", err);
      }
    }
  }
}
