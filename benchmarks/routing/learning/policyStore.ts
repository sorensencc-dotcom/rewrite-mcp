import { writeFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { OptimizedPolicy } from "./optimizer";
import { TASK_CONFIG, DEFAULT_CONSTRAINTS } from "../policy";

const POLICIES_DIR = join(process.cwd(), "benchmarks", "routing", "learning", "policies");

export function ensurePoliciesDir() {
  if (!existsSync(POLICIES_DIR)) {
    mkdirSync(POLICIES_DIR, { recursive: true });
  }
}

export function getActivePoliciesPath(): string {
  ensurePoliciesDir();
  return join(POLICIES_DIR, "policy-active.json");
}

export function loadActivePolicies(): Record<string, OptimizedPolicy> | null {
  const path = getActivePoliciesPath();
  if (!existsSync(path)) return null;

  try {
    const data = readFileSync(path, "utf8");
    return JSON.parse(data) as Record<string, OptimizedPolicy>;
  } catch {
    return null;
  }
}

export function getNextVersionNumber(): number {
  ensurePoliciesDir();
  try {
    const files = readdirSync(POLICIES_DIR);
    let maxVer = 0;
    for (const file of files) {
      const match = file.match(/^policy-v(\d+)\.json$/);
      if (match) {
        const ver = parseInt(match[1], 10);
        if (ver > maxVer) maxVer = ver;
      }
    }
    return maxVer + 1;
  } catch {
    return 1;
  }
}

export function savePolicies(policies: Record<string, OptimizedPolicy>) {
  ensurePoliciesDir();
  const activePath = getActivePoliciesPath();
  const nextVer = getNextVersionNumber();
  const verPath = join(POLICIES_DIR, `policy-v${nextVer}.json`);

  const payload = {
    version: nextVer,
    timestamp: new Date().toISOString(),
    policies,
  };

  // Write versioned policy file
  writeFileSync(verPath, JSON.stringify(payload, null, 2), "utf8");

  // Write/Update active policy reference
  writeFileSync(activePath, JSON.stringify(payload, null, 2), "utf8");
}

export function getPolicyVersion(ver: number): any | null {
  ensurePoliciesDir();
  const verPath = join(POLICIES_DIR, `policy-v${ver}.json`);
  if (!existsSync(verPath)) return null;

  try {
    return JSON.parse(readFileSync(verPath, "utf8"));
  } catch {
    return null;
  }
}

export function getPreviousPolicies(): any | null {
  ensurePoliciesDir();
  const nextVer = getNextVersionNumber();
  const prevVer = nextVer - 2; // Next version is n, active is n-1, previous is n-2
  if (prevVer <= 0) return null;
  return getPolicyVersion(prevVer);
}

export interface PolicyDiff {
  changed: boolean;
  version: { current: number; previous: number };
  timestamp: { current: string; previous: string };
  diffs: Record<string, {
    preferredOrderChanged: boolean;
    preferredOrder: { current: string[]; previous: string[] };
    qualityTarget: { current: number; previous: number; delta: number };
    maxCostUsd: { current: number; previous: number; delta: number };
    localPreference: { current: number; previous: number; delta: number };
    fallbackAggressiveness: { current: number; previous: number; delta: number };
    providerWeights: Record<string, { current: number; previous: number; delta: number }>;
  }>;
}

export function getPolicyDiff(): PolicyDiff | null {
  const currentPayload = loadActivePolicies() as any; // Loaded from policy-active.json
  if (!currentPayload) return null;

  const previousPayload = getPreviousPolicies();
  if (!previousPayload) {
    // If no previous version, return diff against self (or static defaults)
    return {
      changed: false,
      version: { current: currentPayload.version, previous: 0 },
      timestamp: { current: currentPayload.timestamp, previous: "n/a" },
      diffs: {},
    };
  }

  const diffs: PolicyDiff["diffs"] = {};
  let changed = false;

  const currentPolicies = currentPayload.policies;
  const previousPolicies = previousPayload.policies;

  for (const taskType of Object.keys(currentPolicies)) {
    const cur = currentPolicies[taskType];
    const prev = previousPolicies[taskType];

    if (!prev) continue;

    const preferredOrderChanged = JSON.stringify(cur.preferredOrder) !== JSON.stringify(prev.preferredOrder);
    const qualityTargetDelta = cur.qualityTarget - prev.qualityTarget;
    const maxCostUsdDelta = cur.maxCostUsd - prev.maxCostUsd;
    const localPreferenceDelta = cur.localPreference - prev.localPreference;
    const fallbackAggressivenessDelta = cur.fallbackAggressiveness - prev.fallbackAggressiveness;

    if (
      preferredOrderChanged ||
      Math.abs(qualityTargetDelta) > 0.001 ||
      Math.abs(maxCostUsdDelta) > 0.001 ||
      Math.abs(localPreferenceDelta) > 0.001 ||
      Math.abs(fallbackAggressivenessDelta) > 0.001
    ) {
      changed = true;
    }

    const providerWeightsDiff: Record<string, { current: number; previous: number; delta: number }> = {};
    for (const provider of Object.keys(cur.providerWeights || {})) {
      const curW = cur.providerWeights[provider] ?? 1.0;
      const prevW = prev.providerWeights[provider] ?? 1.0;
      const delta = curW - prevW;
      if (Math.abs(delta) > 0.001) changed = true;

      providerWeightsDiff[provider] = {
        current: curW,
        previous: prevW,
        delta,
      };
    }

    diffs[taskType] = {
      preferredOrderChanged,
      preferredOrder: { current: cur.preferredOrder, previous: prev.preferredOrder },
      qualityTarget: { current: cur.qualityTarget, previous: prev.qualityTarget, delta: qualityTargetDelta },
      maxCostUsd: { current: cur.maxCostUsd, previous: prev.maxCostUsd, delta: maxCostUsdDelta },
      localPreference: { current: cur.localPreference, previous: prev.localPreference, delta: localPreferenceDelta },
      fallbackAggressiveness: { current: cur.fallbackAggressiveness, previous: prev.fallbackAggressiveness, delta: fallbackAggressivenessDelta },
      providerWeights: providerWeightsDiff,
    };
  }

  return {
    changed,
    version: { current: currentPayload.version, previous: previousPayload.version },
    timestamp: { current: currentPayload.timestamp, previous: previousPayload.timestamp },
    diffs,
  };
}

// Generates default policies based on TASK_CONFIG when no trained model exists
export function getDefaultPolicies(): Record<string, OptimizedPolicy> {
  const defaults: Record<string, OptimizedPolicy> = {};
  
  const allTasks: ("rewrite" | "analysis" | "generation" | "chat")[] = [
    "rewrite",
    "analysis",
    "generation",
    "chat",
  ];

  for (const taskType of allTasks) {
    const config = TASK_CONFIG[taskType];
    defaults[taskType] = {
      taskType,
      preferredOrder: config ? config.candidates.map((c: any) => c.model) : [],
      qualityTarget: taskType === "rewrite" || taskType === "analysis" ? 8.0 : 7.0,
      maxCostUsd: DEFAULT_CONSTRAINTS.maxCostPerRequestUsd,
      fallbackAggressiveness: 0.5,
      localPreference: 0.2,
      providerWeights: {
        anthropic: 1.0,
        google: 1.0,
        microsoft: 1.0,
        ollama: 1.0,
      },
    };
  }

  return defaults;
}
