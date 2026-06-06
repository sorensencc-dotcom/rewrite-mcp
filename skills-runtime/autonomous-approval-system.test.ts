/**
 * Autonomous Approval System Tests
 *
 * Comprehensive test coverage for:
 * - Autonomous context detection and validation
 * - Decision engine auto-approve/auto-reject logic
 * - All 6 approval guards (git, npm, mcp, policy, docs, validation)
 * - Autonomous vs non-autonomous mode behavior
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { AutonomousContextManager, isAutonomousMode } from './autonomous-context';
import { AutonomousDecisionEngine } from './autonomous-decision-engine';
import { AutonomousApprovalBlockedError, isAutonomousApprovalBlocked } from './autonomous-approval-error';
import { GitApprovalGuard } from './git-approval-guard';
import { NpmApprovalGuard } from './npm-approval-guard';
import { McpApprovalGuard } from './mcp-approval-guard';
import { PolicyApprovalGuard } from './policy-approval-guard';
import { DocsApprovalGuard } from './docs-approval-guard';
import { ValidationApprovalGuard } from './validation-approval-guard';

const CONTEXT_FILE = path.join(process.cwd(), '.autonomous-context.json');

describe('Autonomous Approval System', () => {
  beforeEach(() => {
    delete process.env.AUTONOMOUS_EXECUTION;
    if (fs.existsSync(CONTEXT_FILE)) {
      fs.unlinkSync(CONTEXT_FILE);
    }
  });

  afterEach(() => {
    delete process.env.AUTONOMOUS_EXECUTION;
    if (fs.existsSync(CONTEXT_FILE)) {
      fs.unlinkSync(CONTEXT_FILE);
    }
  });

  // ========== AUTONOMOUS CONTEXT TESTS ==========

  describe('AutonomousContextManager', () => {
    it('should detect autonomous mode disabled by default', () => {
      const manager = new AutonomousContextManager();
      expect(manager.isAutonomousMode()).toBe(false);
    });

    it('should detect autonomous mode when env var and context file are both valid', () => {
      const manager = new AutonomousContextManager();
      const context = AutonomousContextManager.createContext('yes', 'session-123');
      AutonomousContextManager.saveContext(context);

      process.env.AUTONOMOUS_EXECUTION = 'true';

      expect(manager.isAutonomousMode()).toBe(true);
    });

    it('should reject autonomous mode if only env var is set', () => {
      const manager = new AutonomousContextManager();
      process.env.AUTONOMOUS_EXECUTION = 'true';

      expect(manager.isAutonomousMode()).toBe(false);
    });

    it('should reject expired autonomous context', () => {
      const manager = new AutonomousContextManager();
      const context = AutonomousContextManager.createContext('go', 'session-123');
      // Manually set context to be > 1 hour old
      context.timestamp = Date.now() - 3700000;
      AutonomousContextManager.saveContext(context);

      process.env.AUTONOMOUS_EXECUTION = 'true';

      expect(manager.isAutonomousMode()).toBe(false);
    });

    it('should create valid context from approval text', () => {
      const context = AutonomousContextManager.createContext('yes proceed', 'test-session');

      expect(context.enabled).toBe(true);
      expect(context.sessionId).toBe('test-session');
      expect(context.approvalHash).toMatch(/^[a-f0-9]{64}$/);
      expect(context.timestamp).toBeGreaterThan(0);
    });

    it('should reject invalid approval text', () => {
      expect(() => {
        AutonomousContextManager.createContext('maybe later', 'test-session');
      }).toThrow();
    });
  });

  // ========== DECISION ENGINE TESTS ==========

  describe('AutonomousDecisionEngine', () => {
    let engine: AutonomousDecisionEngine;

    beforeEach(() => {
      engine = new AutonomousDecisionEngine();
    });

    it('should auto-approve safe git operations', () => {
      const decision = engine.autoDecide('log', 'git');
      expect(decision.decision).toBe('approve');
      expect(decision.reason).toContain('safe-operation');
    });

    it('should auto-reject risky git operations', () => {
      const decision = engine.autoDecide('push', 'git');
      expect(decision.decision).toBe('reject');
      expect(decision.reason).toContain('risky-operation');
    });

    it('should auto-approve safe npm operations', () => {
      const decision = engine.autoDecide('list', 'npm');
      expect(decision.decision).toBe('approve');
    });

    it('should auto-reject risky npm operations', () => {
      const decision = engine.autoDecide('publish', 'npm');
      expect(decision.decision).toBe('reject');
    });

    it('should auto-approve whitelisted mcp tools', () => {
      const decision = engine.autoDecide('ideas-summary', 'helm:ideas-summary');
      expect(decision.decision).toBe('approve');
    });

    it('should auto-approve safe doc operations', () => {
      const decision = engine.autoDecide('typo', 'docs');
      expect(decision.decision).toBe('approve');
    });

    it('should auto-reject risky doc operations', () => {
      const decision = engine.autoDecide('restructure', 'docs');
      expect(decision.decision).toBe('reject');
    });

    it('should auto-approve safe validation operations', () => {
      const decision = engine.autoDecide('lint', 'validation');
      expect(decision.decision).toBe('approve');
    });

    it('should auto-reject risky validation operations', () => {
      const decision = engine.autoDecide('auto-fix', 'validation');
      expect(decision.decision).toBe('reject');
    });

    it('should block unknown operations', () => {
      const decision = engine.autoDecide('unknown-op', 'unknown-tool');
      expect(decision.decision).toBe('blocked');
      expect(decision.reason).toContain('unknown-operation');
    });

    it('should detect write side effects', () => {
      const decision = engine.autoDecide('update', 'custom-tool', { target: 'data' });
      expect(['reject', 'blocked']).toContain(decision.decision);
    });

    it('should detect security operations', () => {
      const decision = engine.autoDecide('set-secret', 'tool', {});
      expect(['reject', 'blocked']).toContain(decision.decision);
    });
  });

  // ========== APPROVAL GUARD TESTS ==========

  describe('Git Approval Guard', () => {
    let guard: GitApprovalGuard;

    beforeEach(() => {
      guard = new GitApprovalGuard();
    });

    it('should auto-approve safe operations in autonomous mode', async () => {
      const context = AutonomousContextManager.createContext('go', 'test');
      AutonomousContextManager.saveContext(context);
      process.env.AUTONOMOUS_EXECUTION = 'true';

      const result = await guard.checkApproval('status');
      expect(result.requiresApproval).toBe(false);
    });

    it('should block risky operations in autonomous mode', async () => {
      const context = AutonomousContextManager.createContext('go', 'test');
      AutonomousContextManager.saveContext(context);
      process.env.AUTONOMOUS_EXECUTION = 'true';

      await expect(guard.checkApproval('push')).rejects.toThrow(AutonomousApprovalBlockedError);
    });

    it('should allow normal flow in non-autonomous mode', async () => {
      const result = await guard.checkApproval('push');
      expect(result.requiresApproval).toBe(true);
    });
  });

  describe('NPM Approval Guard', () => {
    let guard: NpmApprovalGuard;

    beforeEach(() => {
      guard = new NpmApprovalGuard();
    });

    it('should auto-approve test and build in autonomous mode', async () => {
      const context = AutonomousContextManager.createContext('proceed', 'test');
      AutonomousContextManager.saveContext(context);
      process.env.AUTONOMOUS_EXECUTION = 'true';

      const testResult = await guard.checkApproval('test');
      expect(testResult.requiresApproval).toBe(false);

      const buildResult = await guard.checkApproval('build');
      expect(buildResult.requiresApproval).toBe(false);
    });

    it('should block publish in autonomous mode', async () => {
      const context = AutonomousContextManager.createContext('go', 'test');
      AutonomousContextManager.saveContext(context);
      process.env.AUTONOMOUS_EXECUTION = 'true';

      await expect(guard.checkApproval('publish')).rejects.toThrow(AutonomousApprovalBlockedError);
    });
  });

  describe('MCP Approval Guard', () => {
    let guard: McpApprovalGuard;

    beforeEach(() => {
      guard = new McpApprovalGuard();
    });

    it('should auto-approve whitelisted tools in autonomous mode', async () => {
      const context = AutonomousContextManager.createContext('yes', 'test');
      AutonomousContextManager.saveContext(context);
      process.env.AUTONOMOUS_EXECUTION = 'true';

      const result = await guard.checkApproval('ideas-summary');
      expect(result.requiresApproval).toBe(false);
    });

    it('should auto-approve helm and idea tools in autonomous mode', async () => {
      const context = AutonomousContextManager.createContext('go', 'test');
      AutonomousContextManager.saveContext(context);
      process.env.AUTONOMOUS_EXECUTION = 'true';

      const helmResult = await guard.checkApproval('summary', { tool: 'helm:dashboard' });
      expect(helmResult.requiresApproval).toBe(false);
    });
  });

  describe('Policy Approval Guard', () => {
    let guard: PolicyApprovalGuard;

    beforeEach(() => {
      guard = new PolicyApprovalGuard();
    });

    it('should auto-approve validation in autonomous mode', async () => {
      const context = AutonomousContextManager.createContext('proceed', 'test');
      AutonomousContextManager.saveContext(context);
      process.env.AUTONOMOUS_EXECUTION = 'true';

      const result = await guard.checkApproval('validate');
      expect(result.requiresApproval).toBe(false);
    });

    it('should block enforcement in autonomous mode', async () => {
      const context = AutonomousContextManager.createContext('yes', 'test');
      AutonomousContextManager.saveContext(context);
      process.env.AUTONOMOUS_EXECUTION = 'true';

      await expect(guard.checkApproval('enforce')).rejects.toThrow(AutonomousApprovalBlockedError);
    });
  });

  describe('Docs Approval Guard', () => {
    let guard: DocsApprovalGuard;

    beforeEach(() => {
      guard = new DocsApprovalGuard();
    });

    it('should auto-approve safe doc updates in autonomous mode', async () => {
      const context = AutonomousContextManager.createContext('go', 'test');
      AutonomousContextManager.saveContext(context);
      process.env.AUTONOMOUS_EXECUTION = 'true';

      const result = await guard.checkApproval('doc-update:typo');
      expect(result.requiresApproval).toBe(false);
    });

    it('should block breaking changes in autonomous mode', async () => {
      const context = AutonomousContextManager.createContext('yes', 'test');
      AutonomousContextManager.saveContext(context);
      process.env.AUTONOMOUS_EXECUTION = 'true';

      await expect(guard.checkApproval('doc-update:breaking-change')).rejects.toThrow(
        AutonomousApprovalBlockedError
      );
    });
  });

  describe('Validation Approval Guard', () => {
    let guard: ValidationApprovalGuard;

    beforeEach(() => {
      guard = new ValidationApprovalGuard();
    });

    it('should auto-approve all validation checks in autonomous mode', async () => {
      const context = AutonomousContextManager.createContext('proceed', 'test');
      AutonomousContextManager.saveContext(context);
      process.env.AUTONOMOUS_EXECUTION = 'true';

      const lintResult = await guard.checkApproval('lint');
      expect(lintResult.requiresApproval).toBe(false);

      const typeResult = await guard.checkApproval('type-check');
      expect(typeResult.requiresApproval).toBe(false);
    });

    it('should block auto-fix in autonomous mode', async () => {
      const context = AutonomousContextManager.createContext('go', 'test');
      AutonomousContextManager.saveContext(context);
      process.env.AUTONOMOUS_EXECUTION = 'true';

      await expect(guard.checkApproval('auto-fix')).rejects.toThrow(AutonomousApprovalBlockedError);
    });
  });

  // ========== ERROR TESTS ==========

  describe('AutonomousApprovalBlockedError', () => {
    it('should create error with all details', () => {
      const error = new AutonomousApprovalBlockedError({
        operation: 'push',
        tool: 'git',
        reason: 'risky-operation',
        riskLevel: 'high',
        guidance: 'Use --force to override',
        timestamp: Date.now(),
      });

      expect(error.name).toBe('AutonomousApprovalBlockedError');
      expect(error.details.operation).toBe('push');
      expect(isAutonomousApprovalBlocked(error)).toBe(true);
    });

    it('should format error message for operator', () => {
      const error = new AutonomousApprovalBlockedError({
        operation: 'push',
        tool: 'git',
        reason: 'risky-operation',
        timestamp: Date.now(),
      });

      const concise = error.getConciseMessage();
      expect(concise).toContain('Approval blocked');
      expect(concise).toContain('git');
    });
  });

  // ========== INTEGRATION TESTS ==========

  describe('Full Autonomous Flow', () => {
    it('should allow complete safe operations chain in autonomous mode', async () => {
      const context = AutonomousContextManager.createContext('go', 'test-123');
      AutonomousContextManager.saveContext(context);
      process.env.AUTONOMOUS_EXECUTION = 'true';

      const gitGuard = new GitApprovalGuard();
      const npmGuard = new NpmApprovalGuard();
      const docsGuard = new DocsApprovalGuard();

      // All safe operations should succeed
      const git = await gitGuard.checkApproval('log');
      expect(git.requiresApproval).toBe(false);

      const npm = await npmGuard.checkApproval('test');
      expect(npm.requiresApproval).toBe(false);

      const docs = await docsGuard.checkApproval('doc-update:clarification');
      expect(docs.requiresApproval).toBe(false);
    });

    it('should block at first risky operation in autonomous mode', async () => {
      const context = AutonomousContextManager.createContext('proceed', 'test-123');
      AutonomousContextManager.saveContext(context);
      process.env.AUTONOMOUS_EXECUTION = 'true';

      const gitGuard = new GitApprovalGuard();

      // Safe operation succeeds
      const log = await gitGuard.checkApproval('log');
      expect(log.requiresApproval).toBe(false);

      // Risky operation fails
      await expect(gitGuard.checkApproval('push')).rejects.toThrow(AutonomousApprovalBlockedError);
    });

    it('should fall back to normal flow when not in autonomous mode', async () => {
      const gitGuard = new GitApprovalGuard();
      const npmGuard = new NpmApprovalGuard();

      // Both safe and risky operations need approval in normal mode
      const logResult = await gitGuard.checkApproval('push');
      expect(logResult.requiresApproval).toBe(true);

      const npmResult = await npmGuard.checkApproval('publish');
      expect(npmResult.requiresApproval).toBe(true);
    });
  });
});
