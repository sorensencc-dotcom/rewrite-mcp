/**
 * Autonomous Decision Engine
 *
 * During autonomous mode execution, auto-decides approval requests based on:
 * - Operation safety (read vs write)
 * - Tool/command classification (whitelisted, known, unknown)
 * - Policy compliance (no violations)
 * - Cached approval status
 */

export type AutoDecisionType = 'approve' | 'reject' | 'blocked';

export interface AutoDecision {
  decision: AutoDecisionType;
  reason: string;
  autonomousDecision: true;
  operation: string;
  tool: string;
  details?: Record<string, unknown>;
}

export interface OperationClassification {
  category: 'safe' | 'risky' | 'unknown';
  riskLevel: 'low' | 'medium' | 'high';
  reasoning: string;
}

/**
 * Categories of safe (auto-approvable) operations
 */
const SAFE_OPERATIONS = {
  // Read-only git operations
  git: {
    safe: ['log', 'status', 'diff', 'show', 'ls-files', 'rev-parse'],
    risky: ['push', 'force-push', 'reset', 'revert', 'merge', 'rebase'],
  },
  // Read-only npm operations
  npm: {
    safe: ['list', 'ls', 'view', 'info', 'version', 'audit --json'],
    risky: ['publish', 'install', 'update', 'remove', 'ci'],
  },
  // MCP/tool operations
  tools: {
    safe: [
      'helm:ideas-summary',
      'helm:pri-search',
      'helm:rl-pipeline',
      'helm:cic-status',
      'helm:credit-score',
      'idea:inbox',
      'idea:list',
      'git:status',
      'git:log',
    ],
    risky: ['npm:publish', 'git:push', 'deployment:deploy', 'secret:set'],
  },
  // Documentation updates (non-breaking)
  docs: {
    safe: ['doc-update:typo', 'doc-update:clarification', 'doc-update:formatting'],
    risky: ['doc-update:restructure', 'doc-update:breaking-change'],
  },
  // Validation operations
  validation: {
    safe: ['lint:check', 'type:check', 'schema:validate'],
    risky: ['fix:apply', 'auto-format:apply'],
  },
};

export class AutonomousDecisionEngine {
  /**
   * Auto-decide an approval request during autonomous execution
   */
  autoDecide(operation: string, tool: string, args: Record<string, unknown> = {}): AutoDecision {
    const classification = this.classifyOperation(operation, tool, args);

    if (classification.category === 'safe') {
      return {
        decision: 'approve',
        reason: `safe-operation: ${classification.reasoning}`,
        autonomousDecision: true,
        operation,
        tool,
        details: { riskLevel: classification.riskLevel },
      };
    }

    if (classification.category === 'risky') {
      return {
        decision: 'reject',
        reason: `risky-operation: ${classification.reasoning}`,
        autonomousDecision: true,
        operation,
        tool,
        details: { riskLevel: classification.riskLevel },
      };
    }

    // Unknown operations block execution
    return {
      decision: 'blocked',
      reason: `unknown-operation: cannot auto-decide ${tool}:${operation}`,
      autonomousDecision: true,
      operation,
      tool,
      details: { riskLevel: 'high' },
    };
  }

  /**
   * Classify an operation as safe/risky/unknown
   */
  private classifyOperation(
    operation: string,
    tool: string,
    args: Record<string, unknown>
  ): OperationClassification {
    // Check against known safe operations
    if (this.isSafeOperation(tool, operation)) {
      return {
        category: 'safe',
        riskLevel: 'low',
        reasoning: `${tool}:${operation} is in safe operation list`,
      };
    }

    // Check against known risky operations
    if (this.isRiskyOperation(tool, operation)) {
      return {
        category: 'risky',
        riskLevel: 'high',
        reasoning: `${tool}:${operation} is in risky operation list`,
      };
    }

    // Heuristic checks for unknown operations
    if (this.hasWriteSideEffect(tool, operation, args)) {
      return {
        category: 'risky',
        riskLevel: 'high',
        reasoning: `${tool}:${operation} appears to have write/mutating side effects`,
      };
    }

    if (this.isSecurityRelated(tool, operation)) {
      return {
        category: 'risky',
        riskLevel: 'high',
        reasoning: `${tool}:${operation} is security/credential related`,
      };
    }

    // Default to unknown/blocked
    return {
      category: 'unknown',
      riskLevel: 'high',
      reasoning: `${tool}:${operation} is not recognized; cannot auto-approve unknown operations`,
    };
  }

  /**
   * Check if operation is in safe list
   */
  private isSafeOperation(tool: string, operation: string): boolean {
    const toolType = this.getTool Type(tool);
    if (!toolType) return false;

    const safeOps = SAFE_OPERATIONS[toolType as keyof typeof SAFE_OPERATIONS]?.safe || [];
    return safeOps.some((op) => operation.includes(op) || op.includes(operation));
  }

  /**
   * Check if operation is in risky list
   */
  private isRiskyOperation(tool: string, operation: string): boolean {
    const toolType = this.getToolType(tool);
    if (!toolType) return false;

    const riskyOps = SAFE_OPERATIONS[toolType as keyof typeof SAFE_OPERATIONS]?.risky || [];
    return riskyOps.some((op) => operation.includes(op) || op.includes(operation));
  }

  /**
   * Detect if operation has write/mutating side effects
   */
  private hasWriteSideEffect(
    tool: string,
    operation: string,
    args: Record<string, unknown>
  ): boolean {
    const writeSideEffectPatterns = [
      /write|create|update|delete|remove|modify|add|push|publish|deploy|set|put/i,
      /^(?!query|get|list|search|find|status|info|view|log|show)/i, // Deny patterns
    ];

    if (writeSideEffectPatterns.some((p) => p.test(`${tool}:${operation}`))) {
      return true;
    }

    // Check args for write indicators
    if (args.force === true || args.hard === true || args.delete === true) {
      return true;
    }

    if (typeof args.target === 'string' && args.target.includes('prod')) {
      return true;
    }

    return false;
  }

  /**
   * Check if operation is security/credential related
   */
  private isSecurityRelated(tool: string, operation: string): boolean {
    const securityPatterns = [
      /secret|credential|password|token|key|auth|sign|encrypt|decrypt/i,
      /production|prod|deploy|release|publish|push.*main|push.*master/i,
    ];

    return securityPatterns.some((p) => p.test(`${tool}:${operation}`));
  }

  /**
   * Get tool category from tool name (e.g., "helm:ideas-summary" → "tools")
   */
  private getToolType(tool: string): string | null {
    if (tool.startsWith('git:')) return 'git';
    if (tool.startsWith('npm:')) return 'npm';
    if (tool.startsWith('helm:') || tool.startsWith('idea:')) return 'tools';
    if (tool.startsWith('doc-update:')) return 'docs';
    if (tool.startsWith('lint:') || tool.startsWith('type:') || tool.startsWith('schema:'))
      return 'validation';
    return null;
  }

  /**
   * Check if an operation is whitelisted (pre-approved at policy level)
   */
  isWhitelisted(tool: string, operation: string, whitelist: string[] = []): boolean {
    const fullName = `${tool}:${operation}`;
    return whitelist.some((w) => fullName.includes(w) || w.includes(fullName));
  }

  /**
   * Get all safe operations (for documentation/testing)
   */
  getSafeOperations(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(SAFE_OPERATIONS)) {
      result[key] = value.safe;
    }
    return result;
  }

  /**
   * Get all risky operations (for documentation/testing)
   */
  getRiskyOperations(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(SAFE_OPERATIONS)) {
      result[key] = value.risky;
    }
    return result;
  }
}

// Singleton instance
let engine: AutonomousDecisionEngine | null = null;

export function getAutonomousDecisionEngine(): AutonomousDecisionEngine {
  if (!engine) {
    engine = new AutonomousDecisionEngine();
  }
  return engine;
}
