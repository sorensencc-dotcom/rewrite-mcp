// File: projects/cic/src/cic/control-plane/patch-model.ts | Date: 2026-06-01 | v1.5.0

export type PatchStatus = "proposed" | "canary" | "active" | "rejected";

export interface InstinctPatch {
  fileName?: string; // Loaded dynamically
  instinct: string;
  baseVersion: string;
  proposedVersion: string;
  change: {
    routing_policy?: {
      prefer_skills?: string[];
      avoid_skills?: string[];
      if?: string;
    };
    trigger?: {
      when?: {
        source_format_in?: string[];
      };
    };
  };
  impact: {
    impactScore: number;
    metricsBefore: {
      successRate: number;
      avgLatencyMs: number;
      avgDrift: number;
    };
    metricsAfter: {
      successRate: number;
      avgLatencyMs: number;
      avgDrift: number;
    };
  };
  scope: {
    regions: string[];
    tenants: string[];
  };
  status: PatchStatus;
  createdAt: string;
  createdBy: string;
}
