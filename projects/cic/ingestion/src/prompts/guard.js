// filename: src/prompts/guard.js
// date: 2026-05-18
// version: 1.0.0
// description: CIC Prompt Management System — Prompt Injection Guard
//              Pure function. Detects and rejects prompt injection patterns.

/**
 * @typedef {Object} GuardViolation
 * @property {string} category  Violation category identifier.
 * @property {string} pattern   Human-readable description of the matched pattern.
 * @property {string} match     The actual text fragment that matched.
 * @property {number} index     Character offset of the match in the input.
 */

/**
 * @typedef {Object} GuardResult
 * @property {boolean}          safe        True only if zero violations found.
 * @property {GuardViolation[]} violations  Array of all detected violations.
 */

const INJECTION_PATTERNS = Object.freeze([
  // Multi-turn instruction injection
  {
    category: 'MULTI_TURN_INJECTION',
    description: 'ignore previous instructions',
    regex: /ignore\s+(all\s+)?(previous|prior|earlier|above)\s+(instructions?|prompts?|context|directives?)/gi,
  },
  {
    category: 'MULTI_TURN_INJECTION',
    description: 'disregard instructions',
    regex: /disregard\s+(all\s+)?(previous|prior|earlier|your|the)\s+(instructions?|prompts?|context|directives?|rules?)/gi,
  },
  {
    category: 'MULTI_TURN_INJECTION',
    description: 'forget previous instructions',
    regex: /forget\s+(everything|all|your|previous|prior|earlier|what\s+you)/gi,
  },
  {
    category: 'MULTI_TURN_INJECTION',
    description: 'override system instructions',
    regex: /override\s+(the\s+)?(system\s+)?(instructions?|prompt|context|directives?|rules?)/gi,
  },
  {
    category: 'MULTI_TURN_INJECTION',
    description: 'new instructions replacing prior context',
    regex: /from\s+now\s+on[,\s]+you\s+(are|will|must|should)/gi,
  },
  {
    category: 'MULTI_TURN_INJECTION',
    description: 'reset or clear instruction context',
    regex: /\b(reset|clear|wipe|erase)\s+(your\s+)?(context|instructions?|memory|prompt|prior\s+directives?)/gi,
  },
  // Architecture-changing language
  {
    category: 'ARCHITECTURE_CHANGE',
    description: 'modify training or weights',
    regex: /\b(modify|change|update|alter|retrain|fine-?tune)\s+(your\s+)?(training|weights|parameters|model\s+architecture|neural\s+network)/gi,
  },
  {
    category: 'ARCHITECTURE_CHANGE',
    description: 'replace system prompt',
    regex: /replace\s+(your\s+)?(system\s+prompt|system\s+instructions?|core\s+prompt|base\s+prompt)/gi,
  },
  {
    category: 'ARCHITECTURE_CHANGE',
    description: 'bypass safety or content policy',
    regex: /bypass\s+(your\s+)?(safety|content\s+policy|filters?|restrictions?|guidelines?|guardrails?)/gi,
  },
  {
    category: 'ARCHITECTURE_CHANGE',
    description: 'disable safety mechanisms',
    regex: /\b(disable|turn\s+off|deactivate|remove)\s+(your\s+)?(safety|content\s+filters?|restrictions?|alignment|guardrails?)/gi,
  },
  {
    category: 'ARCHITECTURE_CHANGE',
    description: 'operate without restrictions',
    regex: /operate\s+(without|free\s+from|ignoring)\s+(restrictions?|limitations?|guidelines?|rules?|safety)/gi,
  },
  {
    category: 'ARCHITECTURE_CHANGE',
    description: 'jailbreak attempt indicator',
    regex: /\b(jailbreak|uncensored\s+mode|unrestricted\s+mode|developer\s+mode|god\s+mode|DAN\s+mode)/gi,
  },
  // Model override attempts
  {
    category: 'MODEL_OVERRIDE',
    description: 'you are now a different entity',
    regex: /you\s+are\s+now\s+(a\s+)?(different|another|new|unrestricted|uncensored|free)/gi,
  },
  {
    category: 'MODEL_OVERRIDE',
    description: 'act as a different AI or persona',
    regex: /act\s+as\s+(if\s+you\s+(were|are)\s+)?(a\s+)?(different|another|unrestricted|uncensored|GPT|ChatGPT|DAN|evil\s+AI|rogue)/gi,
  },
  {
    category: 'MODEL_OVERRIDE',
    description: 'pretend to be a different AI',
    regex: /pretend\s+(you\s+are|to\s+be)\s+(a\s+)?(different|another|unrestricted|uncensored|GPT|ChatGPT|DAN)/gi,
  },
  {
    category: 'MODEL_OVERRIDE',
    description: 'simulate being a different model',
    regex: /simulate\s+(being|a)\s+(different|another|unrestricted|uncensored|GPT|ChatGPT|DAN|AI\s+without)/gi,
  },
  {
    category: 'MODEL_OVERRIDE',
    description: 'you are DAN or equivalent jailbreak persona',
    regex: /\b(you\s+are\s+DAN|do\s+anything\s+now|DAN\s+mode|DAN\s+prompt)\b/gi,
  },
  {
    category: 'MODEL_OVERRIDE',
    description: 'switch to a different AI model mid-prompt',
    regex: /switch\s+(to|into)\s+(GPT-?[0-9]+|ChatGPT|Gemini|LLaMA|Mistral|an?\s+unrestricted\s+model)/gi,
  },
]);

/**
 * Guards a prompt string against injection attacks.
 * Pure function: no side effects, no I/O, no global state mutation.
 *
 * @param {string} text  The prompt text to evaluate.
 * @returns {GuardResult}
 * @throws {TypeError}   If text is not a string.
 */
export function guardPrompt(text) {
  if (typeof text !== 'string') {
    throw new TypeError(
      `[guard] guardPrompt: text must be a string; received: ${typeof text}`
    );
  }

  /** @type {GuardViolation[]} */
  const violations = [];

  for (const { category, description, regex } of INJECTION_PATTERNS) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      violations.push({
        category,
        pattern: description,
        match: match[0],
        index: match.index,
      });
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }
    regex.lastIndex = 0;
  }

  return Object.freeze({
    safe: violations.length === 0,
    violations: Object.freeze(violations.map(v => Object.freeze({ ...v }))),
  });
}

/**
 * Strict variant: throws if any violation is found.
 *
 * @param {string} text   The prompt text to evaluate.
 * @param {string} [label] Optional label for error context.
 * @throws {Error}        If any injection pattern is matched.
 */
export function assertSafePrompt(text, label = 'prompt') {
  const result = guardPrompt(text);
  if (!result.safe) {
    const summary = result.violations
      .map(v => `  [${v.category}] "${v.match}" at index ${v.index} — ${v.pattern}`)
      .join('\n');
    throw new Error(
      `[guard] Injection violations detected in ${label} ` +
      `(${result.violations.length} violation(s)):\n${summary}`
    );
  }
}
