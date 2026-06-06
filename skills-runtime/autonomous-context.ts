/**
 * Autonomous Execution Context Detection & Validation
 *
 * Validates that autonomous mode is active and properly configured.
 * Returns false if context is invalid, expired, or unavailable.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface AutonomousContext {
  enabled: boolean;
  approvalHash: string;
  timestamp: number;
  sessionId: string;
  expiresAt: number;
  rules: {
    allowAutoApprove: boolean;
    allowAutoReject: boolean;
    maxAutoApproveAge: number;
  };
}

const CONTEXT_FILE = path.join(process.cwd(), '.autonomous-context.json');
const CONTEXT_EXPIRY_MS = 3600000; // 1 hour
const APPROVAL_KEYWORDS = ['yes', 'go', 'proceed'];

export class AutonomousContextManager {
  private context: AutonomousContext | null = null;
  private validated = false;

  /**
   * Check if autonomous mode is currently active
   */
  isAutonomousMode(): boolean {
    if (!this.validated) {
      this.validateContext();
    }
    return this.context?.enabled ?? false;
  }

  /**
   * Get the current autonomous context (if valid)
   */
  getContext(): AutonomousContext | null {
    if (!this.validated) {
      this.validateContext();
    }
    return this.context;
  }

  /**
   * Validate autonomous context from:
   * 1. Environment variable AUTONOMOUS_EXECUTION=true
   * 2. Context file .autonomous-context.json
   * Both must be present and consistent
   */
  private validateContext(): void {
    this.validated = true;

    // Check environment variable
    const envEnabled = process.env.AUTONOMOUS_EXECUTION === 'true';
    if (!envEnabled) {
      this.context = null;
      return;
    }

    // Check context file exists and is valid
    if (!fs.existsSync(CONTEXT_FILE)) {
      console.warn('⚠ Autonomous mode enabled but context file missing');
      this.context = null;
      return;
    }

    try {
      const fileContent = fs.readFileSync(CONTEXT_FILE, 'utf-8');
      const parsed = JSON.parse(fileContent) as AutonomousContext;

      // Validate required fields
      if (!parsed.approvalHash || !parsed.timestamp || !parsed.sessionId) {
        console.warn('⚠ Autonomous context file missing required fields');
        this.context = null;
        return;
      }

      // Check expiry
      const age = Date.now() - parsed.timestamp;
      if (age > CONTEXT_EXPIRY_MS) {
        console.warn('⚠ Autonomous context expired (>1 hour old)');
        this.context = null;
        return;
      }

      // Validate approval hash format (sha256 hex)
      if (!/^[a-f0-9]{64}$/.test(parsed.approvalHash)) {
        console.warn('⚠ Autonomous context has invalid approval hash');
        this.context = null;
        return;
      }

      // Context is valid
      this.context = {
        enabled: true,
        approvalHash: parsed.approvalHash,
        timestamp: parsed.timestamp,
        sessionId: parsed.sessionId,
        expiresAt: parsed.timestamp + CONTEXT_EXPIRY_MS,
        rules: parsed.rules || {
          allowAutoApprove: true,
          allowAutoReject: true,
          maxAutoApproveAge: 3600000,
        },
      };
    } catch (e) {
      console.warn(`⚠ Failed to parse autonomous context: ${(e as Error).message}`);
      this.context = null;
    }
  }

  /**
   * Create autonomous context from approval text
   * Used to set up autonomous mode when user gives approval
   */
  static createContext(approvalText: string, sessionId: string): AutonomousContext {
    // Verify approval text contains one of the keywords
    const normalized = approvalText.toLowerCase().trim();
    const hasApproval = APPROVAL_KEYWORDS.some((kw) => normalized.includes(kw));

    if (!hasApproval) {
      throw new Error(
        `Invalid approval text. Must contain one of: ${APPROVAL_KEYWORDS.join(', ')}`
      );
    }

    const approvalHash = crypto
      .createHash('sha256')
      .update(approvalText)
      .digest('hex');

    const context: AutonomousContext = {
      enabled: true,
      approvalHash,
      timestamp: Date.now(),
      sessionId,
      expiresAt: Date.now() + CONTEXT_EXPIRY_MS,
      rules: {
        allowAutoApprove: true,
        allowAutoReject: true,
        maxAutoApproveAge: 3600000,
      },
    };

    return context;
  }

  /**
   * Save context to file (internal use)
   */
  static saveContext(context: AutonomousContext): void {
    try {
      fs.writeFileSync(CONTEXT_FILE, JSON.stringify(context, null, 2), 'utf-8');
    } catch (e) {
      console.error(`✗ Failed to save autonomous context: ${(e as Error).message}`);
    }
  }

  /**
   * Clear autonomous context (when batch completes or user cancels)
   */
  static clearContext(): void {
    try {
      if (fs.existsSync(CONTEXT_FILE)) {
        fs.unlinkSync(CONTEXT_FILE);
      }
    } catch (e) {
      console.error(`✗ Failed to clear autonomous context: ${(e as Error).message}`);
    }
  }

  /**
   * Get remaining time in autonomous mode (ms)
   */
  getTimeRemaining(): number {
    if (!this.context) return 0;
    const remaining = this.context.expiresAt - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Check if context will expire soon (< 5 minutes)
   */
  willExpireSoon(): boolean {
    return this.getTimeRemaining() < 300000;
  }
}

// Singleton instance
let manager: AutonomousContextManager | null = null;

export function getAutonomousContextManager(): AutonomousContextManager {
  if (!manager) {
    manager = new AutonomousContextManager();
  }
  return manager;
}

export function isAutonomousMode(): boolean {
  return getAutonomousContextManager().isAutonomousMode();
}
