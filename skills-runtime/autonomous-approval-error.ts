/**
 * Autonomous Approval Blocked Error
 *
 * Thrown when an operation requires approval during autonomous execution
 * and the approval cannot be auto-decided (blocked or risky).
 *
 * This is NOT a bug — it's intentional fail-fast behavior.
 */

export interface ApprovalBlockedDetails {
  operation: string;
  tool: string;
  reason: string;
  riskLevel?: 'low' | 'medium' | 'high';
  guidance?: string;
  timestamp: number;
  autonomousContext?: {
    sessionId: string;
    approvalHash: string;
  };
}

export class AutonomousApprovalBlockedError extends Error {
  readonly details: ApprovalBlockedDetails;
  readonly isAutonomousBlock = true;

  constructor(details: ApprovalBlockedDetails) {
    const message = `[AUTONOMOUS MODE] Approval blocked: ${details.tool}:${details.operation}
Reason: ${details.reason}
Risk Level: ${details.riskLevel ?? 'unknown'}

${details.guidance ?? 'Cannot auto-approve this operation during autonomous execution.'}

To proceed:
1. Exit autonomous mode and approve manually, OR
2. Modify policy/whitelist and restart, OR
3. Run outside autonomous context`;

    super(message);
    this.name = 'AutonomousApprovalBlockedError';
    this.details = {
      ...details,
      timestamp: details.timestamp || Date.now(),
    };
  }

  /**
   * Get structured error data for logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      details: this.details,
      isAutonomousBlock: this.isAutonomousBlock,
    };
  }

  /**
   * Get concise error message for operator display
   */
  getConciseMessage(): string {
    return `Approval blocked (${this.details.tool}): ${this.details.reason}`;
  }
}

/**
 * Helper to check if error is an autonomous approval block
 */
export function isAutonomousApprovalBlocked(error: unknown): error is AutonomousApprovalBlockedError {
  return (
    error instanceof Error &&
    'isAutonomousBlock' in error &&
    (error as AutonomousApprovalBlockedError).isAutonomousBlock === true
  );
}
