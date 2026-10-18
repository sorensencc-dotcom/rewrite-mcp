export const GUARD_STATUS = Object.freeze({
  HEALTHY: 'HEALTHY',
  WARNING: 'WARNING',
  TRIPPED: 'TRIPPED'
});

export const TRIP_REASON = Object.freeze({
  CYCLE_DETECTED: 'CYCLE_DETECTED',
  CONSECUTIVE_RETRY_LIMIT: 'CONSECUTIVE_RETRY_LIMIT',
  MAX_TURNS_EXCEEDED: 'MAX_TURNS_EXCEEDED',
  PROGRESS_STALLED: 'PROGRESS_STALLED'
});

export const WORKLOAD_TYPES = Object.freeze([
  'customer_support_multi_turn',
  'constrained_scheduling',
  'ecommerce_order_fulfillment',
  'unconstrained_wander_adversarial',
  'all'
]);

export const MODEL_PRICING = Object.freeze({
  'meta-muse-wonder': {
    name: 'Meta Muse Wonder',
    inputPerMillion: 4.00,
    outputPerMillion: 20.00,
    cacheReadPerMillion: 0.20,
    webSearchPerThousand: 2.50
  },
  'claude-sonnet-5.5': {
    name: 'Claude Sonnet 5.5',
    inputPerMillion: 3.00,
    outputPerMillion: 15.00,
    cacheReadPerMillion: 0,
    webSearchPerThousand: 0
  },
  'gpt-6.1-sol': {
    name: 'GPT-6.1 Sol',
    inputPerMillion: 5.00,
    outputPerMillion: 25.00,
    cacheReadPerMillion: 0,
    webSearchPerThousand: 0
  },
  'claude-haiku-5.5': {
    name: 'Claude Haiku 5.5',
    inputPerMillion: 0.10,
    outputPerMillion: 0.40,
    cacheReadPerMillion: 0,
    webSearchPerThousand: 0
  }
});

export function canonicalizeArgs(args) {
  if (args === null || args === undefined) {
    return '';
  }
  if (typeof args !== 'object') {
    return String(args);
  }
  if (Array.isArray(args)) {
    return JSON.stringify(args.map(item => (typeof item === 'object' && item !== null ? sortKeys(item) : item)));
  }
  return JSON.stringify(sortKeys(args));
}

function sortKeys(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }
  const sorted = {};
  for (const key of Object.keys(obj).sort()) {
    const value = obj[key];
    sorted[key] = (typeof value === 'object' && value !== null) ? sortKeys(value) : value;
  }
  return sorted;
}

export function createGuardConfig(overrides = {}) {
  const config = {
    maxCycleRepetitions: 2,
    maxConsecutiveRetries: 3,
    maxTurns: 30,
    warningTurnThreshold: 20,
    maxCycleLength: 5,
    ...overrides
  };

  if (config.maxTurns <= 0) {
    throw new RangeError('maxTurns must be greater than 0');
  }
  if (config.maxCycleRepetitions < 1) {
    throw new RangeError('maxCycleRepetitions must be at least 1');
  }
  if (config.maxConsecutiveRetries < 1) {
    throw new RangeError('maxConsecutiveRetries must be at least 1');
  }
  if (config.maxCycleLength < 1) {
    throw new RangeError('maxCycleLength must be at least 1');
  }

  return Object.freeze(config);
}

export function createActionTrace({ toolName, args = {}, turnIndex = 0, success = true, timestamp = Date.now() }) {
  if (!toolName || typeof toolName !== 'string') {
    throw new TypeError('toolName must be a non-empty string');
  }
  return Object.freeze({
    toolName,
    args,
    canonicalArgs: canonicalizeArgs(args),
    turnIndex: Number(turnIndex),
    success: Boolean(success),
    timestamp: Number(timestamp)
  });
}

export function createGuardEvaluation({
  status,
  reason = null,
  turnCount = 0,
  escalation = null,
  message = ''
}) {
  if (!Object.values(GUARD_STATUS).includes(status)) {
    throw new TypeError(`Invalid GuardStatus: ${status}`);
  }
  if (reason !== null && !Object.values(TRIP_REASON).includes(reason)) {
    throw new TypeError(`Invalid TripReason: ${reason}`);
  }
  return Object.freeze({
    status,
    reason,
    turnCount,
    escalation,
    message
  });
}

export function calculateCost(modelKey, { inputTokens = 0, outputTokens = 0, cacheReadTokens = 0, webSearchCount = 0 }) {
  const profile = MODEL_PRICING[modelKey];
  if (!profile) {
    throw new Error(`Unknown model key: ${modelKey}`);
  }
  let cost = (inputTokens / 1_000_000) * profile.inputPerMillion +
             (outputTokens / 1_000_000) * profile.outputPerMillion;
  if (profile.cacheReadPerMillion) {
    cost += (cacheReadTokens / 1_000_000) * profile.cacheReadPerMillion;
  }
  if (profile.webSearchPerThousand) {
    cost += (webSearchCount / 1_000) * profile.webSearchPerThousand;
  }
  return Math.round(cost * 1_000_000) / 1_000_000;
}
