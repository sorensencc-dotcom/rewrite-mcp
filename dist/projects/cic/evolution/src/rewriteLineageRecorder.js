"use strict";
// File: projects/cic/evolution/src/rewriteLineageRecorder.ts | Date: 2026-06-05 | v1.0.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RewriteLineageRecorder = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
class RewriteLineageRecorder {
    constructor(store, baseDir = process.cwd()) {
        this.store = store;
        this.baseDir = baseDir;
    }
    recordLineage(runResult) {
        const lineageId = `lineage-${node_crypto_1.default.randomUUID()}`;
        const lineageData = {
            lineageId,
            runId: runResult.runId,
            tenantId: runResult.tenantId,
            url: runResult.url,
            discovery: {
                framework: runResult.discovery?.framework || "Unknown",
                contentBlocks: runResult.discovery?.contentBlocks || 0
            },
            redesign: {
                templateId: runResult.redesign?.templateId || "Unknown",
                recommendations: runResult.redesign?.recommendations || [],
                colorSystem: runResult.redesign?.colorSystem || { primary: "", background: "" }
            },
            outreach: {
                uxImprovements: runResult.outreach?.uxImprovements || [],
                recommendations: runResult.outreach?.recommendations || []
            },
            timestamp: Date.now()
        };
        // 1. Write the lineage artifact to evolution ledger
        const outputDir = node_path_1.default.resolve(this.baseDir, "projects/cic/evolution/data");
        node_fs_1.default.mkdirSync(outputDir, { recursive: true });
        const lineagePath = node_path_1.default.join(outputDir, "rewrite_lineage.json");
        node_fs_1.default.writeFileSync(lineagePath, JSON.stringify(lineageData, null, 2), "utf8");
        // 2. Attach lineage to CKG (our project state)
        // Create tenant node if it doesn't already exist
        this.store.appendNode({
            id: `tenant:${lineageData.tenantId}`,
            type: "tenant",
            name: lineageData.tenantId,
            meta: { url: lineageData.url }
        });
        // Create lineage node
        this.store.appendNode({
            id: lineageId,
            type: "lineage",
            name: `Lineage for ${lineageData.tenantId}`,
            meta: {
                runId: lineageData.runId,
                timestamp: lineageData.timestamp,
                framework: lineageData.discovery.framework
            }
        });
        // Link tenant -> lineage
        this.store.appendEdge({
            from: `tenant:${lineageData.tenantId}`,
            to: lineageId,
            type: "has_lineage"
        });
        // Create discovery node
        const discoveryNodeId = `discovery:${lineageData.runId}`;
        this.store.appendNode({
            id: discoveryNodeId,
            type: "discovery_run",
            name: `Discovery for ${lineageData.tenantId}`,
            meta: { contentBlocks: lineageData.discovery.contentBlocks }
        });
        this.store.appendEdge({
            from: lineageId,
            to: discoveryNodeId,
            type: "contains_discovery"
        });
        // Create redesign node
        const redesignNodeId = `redesign:${lineageData.runId}`;
        this.store.appendNode({
            id: redesignNodeId,
            type: "redesign_run",
            name: `Redesign ${lineageData.redesign.templateId}`,
            meta: {
                templateId: lineageData.redesign.templateId,
                colorSystem: lineageData.redesign.colorSystem
            }
        });
        this.store.appendEdge({
            from: lineageId,
            to: redesignNodeId,
            type: "contains_redesign"
        });
        console.log(`[RewriteLineageRecorder] Lineage recorded in CKG for tenant ${lineageData.tenantId} (Lineage ID: ${lineageId})`);
        return lineageData;
    }
}
exports.RewriteLineageRecorder = RewriteLineageRecorder;
//# sourceMappingURL=rewriteLineageRecorder.js.map