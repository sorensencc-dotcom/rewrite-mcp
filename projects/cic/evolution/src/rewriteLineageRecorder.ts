// File: projects/cic/evolution/src/rewriteLineageRecorder.ts | Date: 2026-06-05 | v1.0.0

import { CkgStore } from "../../src/ckg/ckg-store.js";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface LineageData {
  lineageId: string;
  runId: string;
  tenantId: string;
  url: string;
  discovery: {
    framework: string;
    contentBlocks: number;
  };
  redesign: {
    templateId: string;
    recommendations: string[];
    colorSystem: {
      primary: string;
      background: string;
    };
  };
  outreach: {
    uxImprovements: string[];
    recommendations: string[];
  };
  timestamp: number;
}

export class RewriteLineageRecorder {
  constructor(
    private readonly store: CkgStore,
    private readonly baseDir: string = process.cwd()
  ) {}

  public recordLineage(runResult: any): LineageData {
    const lineageId = `lineage-${crypto.randomUUID()}`;

    const lineageData: LineageData = {
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
    const outputDir = path.resolve(this.baseDir, "projects/cic/evolution/data");
    fs.mkdirSync(outputDir, { recursive: true });
    
    const lineagePath = path.join(outputDir, "rewrite_lineage.json");
    fs.writeFileSync(lineagePath, JSON.stringify(lineageData, null, 2), "utf8");

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
