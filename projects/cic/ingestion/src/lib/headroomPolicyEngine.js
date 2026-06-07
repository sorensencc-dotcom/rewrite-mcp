import { getHeadroomTelemetry } from "./headroomTelemetry.js";
import { computeContextEfficiencyScore } from "./headroomAutotune.js";

const state = {
  lastDecision: null,
  decisionLog: []
};

function compare(value, op, threshold) {
  switch (op) {
    case ">=": return value >= threshold;
    case "<=": return value <= threshold;
    case ">": return value > threshold;
    case "<": return value < threshold;
    case "==": return value == threshold;
    default: return false;
  }
}

function evaluateCondition(telemetry, efficiency, condition) {
  for (const key of Object.keys(condition)) {
    const expr = condition[key];
    const match = String(expr).match(/(>=|<=|>|<|==)(.*)/);
    if (!match) continue;
    const op = match[1];
    const threshold = Number(match[2]);

    const value =
      key === "avgCompression"
        ? efficiency.avgCompression
        : key === "avgLatency"
        ? efficiency.avgLatency
        : telemetry[key];

    if (value === undefined || !compare(value, op, threshold)) return false;
  }
  return true;
}

export function evaluatePolicies() {
  const isEnabled = (process.env.HEADROOM_POLICY_ENABLED ?? "true").toLowerCase() === "true";
  if (!isEnabled) {
    state.lastDecision = { action: "enable", reason: "policy_disabled", timestamp: Date.now() };
    return state.lastDecision;
  }

  let activeRules = [];
  try {
    let rawRules = process.env.HEADROOM_POLICY_RULES ?? "[]";
    if (rawRules.startsWith("'") && rawRules.endsWith("'")) {
      rawRules = rawRules.slice(1, -1);
    }
    activeRules = JSON.parse(rawRules);
  } catch {
    activeRules = [];
  }

  const telemetry = getHeadroomTelemetry();
  const efficiency = computeContextEfficiencyScore();

  for (const rule of activeRules) {
    if (evaluateCondition(telemetry, efficiency, rule.if)) {
      const decision = {
        action: rule.then,
        rule: rule.id,
        timestamp: Date.now()
      };
      state.lastDecision = decision;
      state.decisionLog.push(decision);
      return decision;
    }
  }

  const fallback = { action: "enable", rule: "default", timestamp: Date.now() };
  state.lastDecision = fallback;
  state.decisionLog.push(fallback);
  return fallback;
}

export function shouldBypassByPolicy() {
  const interval = Number(process.env.HEADROOM_POLICY_INTERVAL ?? 10000);
  const now = Date.now();
  if (!state.lastDecision || (now - (state.lastDecision.timestamp ?? 0)) > interval) {
    evaluatePolicies();
  }
  return state.lastDecision.action === "bypass";
}

export function getPolicyState() {
  return {
    lastDecision: state.lastDecision,
    decisionLog: state.decisionLog.slice(-50)
  };
}

export function resetPolicyState() {
  state.lastDecision = null;
  state.decisionLog = [];
}
