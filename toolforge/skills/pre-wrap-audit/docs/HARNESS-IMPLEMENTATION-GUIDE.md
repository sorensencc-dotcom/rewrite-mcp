# Harness Implementation Guide: `/finish` + Pre-Wrap Audit Integration

Detailed implementation for Claude Code harness team. Concrete TypeScript code, test cases, integration checklist.

---

## Part 1: Core Implementation

### 1.1 Session Handler Integration

**File:** `.claude/harness/session-end-handler.ts` (or equivalent)

```typescript
import type { SessionContext } from './types';
import { triggerSkill } from './skill-runner';
import { promptUserAcceptance, displayVerdict } from './ui';

/**
 * Handle session end events: /finish, timeout, explicit termination.
 * Pre-wrap-audit runs BEFORE ASHFALL for code change sessions.
 */
export async function handleSessionEnd(
  reason: 'user-finish' | 'timeout' | 'explicit-kill',
  session: SessionContext
): Promise<void> {
  // Detect if session has code changes
  const hasChanges = await detectSessionChanges(session);

  // If explicit /finish or has changes, run audit
  if (reason === 'user-finish' || (hasChanges && reason !== 'explicit-kill')) {
    try {
      const auditReport = await runPreWrapAudit(session);

      // Store audit report in session metadata
      session.metadata.auditReport = auditReport;
      session.metadata.auditTimestamp = new Date().toISOString();

      // Handle verdict
      if (auditReport.verdict === 'RED') {
        // Block termination. Show blockers. Escalate.
        await handleRedVerdict(auditReport, session);
        return; // Don't proceed to ASHFALL. Session stays open.
      }

      if (auditReport.verdict === 'YELLOW') {
        // Escalate for user acceptance
        const accepted = await handleYellowVerdict(auditReport, session);
        if (!accepted) {
          // User declined risk. Session stays open.
          return;
        }
        // User accepted. Log & proceed to ASHFALL.
        session.metadata.auditAcceptance = {
          verdict: 'YELLOW',
          acceptedAt: new Date().toISOString(),
          userStatement: accepted
        };
      }

      // GREEN or YELLOW accepted: Proceed to ASHFALL
    } catch (error) {
      // Audit skill error. Log, but don't block.
      console.warn('[SessionEnd] Pre-wrap-audit error:', error);
      // Proceed to ASHFALL anyway (fail-open)
    }
  }

  // Proceed to ASHFALL (normal session termination)
  await triggerSkill('ashfall', {
    scope: 'full',
    verify: true,
    auditReport: session.metadata.auditReport // Pass audit context to ASHFALL
  });

  // End session
  session.end();
}

/**
 * Detect if session has code changes (git diff, modified files, staged commits).
 */
async function detectSessionChanges(session: SessionContext): Promise<boolean> {
  try {
    // Git commands (bash/PowerShell based on platform)
    const gitStatus = await runCommand('git status --porcelain');
    const gitDiff = await runCommand('git diff --quiet'); // Returns exit 1 if changes

    const hasModified = gitStatus.length > 0; // Files modified or untracked
    const hasStagedChanges = gitDiff !== '';  // Staged changes

    return hasModified || hasStagedChanges;
  } catch (e) {
    // If git fails, assume no changes (conservative)
    return false;
  }
}

/**
 * Run pre-wrap-audit skill. Returns audit report.
 */
async function runPreWrapAudit(
  session: SessionContext
): Promise<AuditReport> {
  const contextInfo = {
    sessionId: session.id,
    projectContext: detectProjectContext(session),
    timestamp: new Date().toISOString(),
    interactive: true, // Prompt user for answers
    gitStatus: await runCommand('git status --porcelain')
  };

  const result = await triggerSkill('pre-wrap-audit', contextInfo);

  return result.auditReport;
}

/**
 * Handle RED verdict. Block termination, show blockers, escalate.
 */
async function handleRedVerdict(
  report: AuditReport,
  session: SessionContext
): Promise<void> {
  const message = `
🛑 RED FLAG: Pre-wrap audit found critical blockers.

Your session cannot terminate until these are resolved:

${report.blockers.map((b, i) => `${i + 1}. ${b}`).join('\n')}

Next steps:
${report.nextSteps
  .filter(s => s.severity === 'BLOCKER')
  .map(s => `• ${s.action}`)
  .join('\n')}

Session remains open. Fix blockers and run /finish again.
  `;

  console.error(message);
  session.metadata.auditBlockers = report.blockers;

  // Escalate to operator if running in attended mode
  if (session.isInteractive) {
    await notifyOperator(session.id, 'RED', report.blockers);
  }

  // Don't throw. Just return & keep session open.
}

/**
 * Handle YELLOW verdict. Prompt user for explicit risk acceptance.
 */
async function handleYellowVerdict(
  report: AuditReport,
  session: SessionContext
): Promise<string | null> {
  const message = `
⚠️  YELLOW FLAG: Pre-wrap audit found important risks.

Risks identified:
${report.risks.map((r, i) => `${i + 1}. ${r}`).join('\n')}

To proceed, you must explicitly accept these risks.

Type the phrase below exactly:

  I accept YELLOW: [specific risk]; [mitigation plan]

Example:
  I accept YELLOW: backwards compatibility untested; will monitor canary for 1 week

Your phrase:
  `;

  // Prompt user (interactive, blocking)
  const userInput = await promptUserForInput(message);

  // Validate phrase starts with "I accept YELLOW:"
  if (
    userInput &&
    userInput.trim().toLowerCase().startsWith('i accept yellow:')
  ) {
    console.log('✅ YELLOW risk accepted. Proceeding to termination...');
    session.metadata.auditYellowAcceptance = {
      acceptedAt: new Date().toISOString(),
      userStatement: userInput.trim()
    };
    return userInput.trim();
  } else {
    console.warn('⚠️  Risk acceptance cancelled or invalid. Session remains open.');
    return null;
  }
}

/**
 * Detect project context (repo name, branch, commit, etc.) for audit.
 */
function detectProjectContext(session: SessionContext): string {
  try {
    const repoName = getRepoName(); // git rev-parse --show-toplevel
    const branch = runCommandSync('git rev-parse --abbrev-ref HEAD');
    const commit = runCommandSync('git rev-parse --short HEAD');
    return `${repoName} (${branch}@${commit})`;
  } catch {
    return 'unknown-repo';
  }
}

/**
 * Notify operator of RED verdict (Slack, email, etc.)
 */
async function notifyOperator(
  sessionId: string,
  verdict: string,
  blockers: string[]
): Promise<void> {
  // Implementation depends on notification system
  // Stub: log to console
  console.log(
    `[NOTIFY-OPERATOR] Session ${sessionId} has ${verdict}: ${blockers.join(', ')}`
  );
}
```

---

### 1.2 CLI Command Integration

**File:** `.claude/harness/cli/finish-command.ts`

```typescript
import { handleSessionEnd } from '../session-end-handler';

/**
 * /finish command handler.
 * Triggers pre-wrap-audit, then ASHFALL, then session end.
 */
export async function handleFinishCommand(
  args: string[],
  session: SessionContext
): Promise<void> {
  const options = parseFinishArgs(args);

  // If --skip-audit flag, bypass audit (not recommended)
  if (options.skipAudit) {
    console.warn(
      '[FINISH] --skip-audit: Skipping pre-wrap-audit. This is logged and flagged.'
    );
    session.metadata.auditSkipped = true;
  }

  // If --override-red flag, allow RED override with escalation
  if (options.overrideRed) {
    if (!options.reason) {
      console.error('[FINISH] --override-red requires --reason="explanation"');
      return;
    }
    console.warn('[FINISH] RED override requested. Escalating to engineering lead...');
    session.metadata.auditOverride = {
      reason: options.reason,
      requestedAt: new Date().toISOString()
    };
  }

  // Handle session end (runs audit, ASHFALL, terminates)
  await handleSessionEnd('user-finish', session);
}

interface FinishOptions {
  skipAudit?: boolean;
  overrideRed?: boolean;
  reason?: string;
}

function parseFinishArgs(args: string[]): FinishOptions {
  const options: FinishOptions = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--skip-audit') {
      options.skipAudit = true;
    } else if (args[i] === '--override-red') {
      options.overrideRed = true;
    } else if (args[i].startsWith('--reason=')) {
      options.reason = args[i].split('=')[1];
    }
  }
  return options;
}
```

---

### 1.3 Session Storage

**File:** `.claude/sessions/[session-id]/audit-report.json`

Structure for storing audit reports:

```json
{
  "sessionId": "abc123xyz789",
  "verdict": "RED|YELLOW|GREEN",
  "timestamp": "2026-07-08T15:30:00Z",
  "projectContext": "c-dev (main@72fa3ad)",
  "coreAnswers": [
    {
      "questionNumber": 1,
      "question": "What am I least confident about?",
      "answer": "Jest never ran in isolation. Async mocking might have gaps.",
      "severity": "HIGH"
    }
  ],
  "extendedAnswers": [
    {
      "questionNumber": 5,
      "question": "Dependencies: external systems, failure modes",
      "answer": "Depends on ASHFALL skill. If missing: phase 3.5 skipped.",
      "assessment": "MITIGATED: Graceful fallback in code"
    }
  ],
  "blockers": [
    "Jest never executed",
    "Submodule state unknown (m castironforge/cic-ingestion)"
  ],
  "risks": [
    "Regression testing incomplete for ASHFALL integration",
    "Load testing deferred to canary phase"
  ],
  "ready": [
    "Code changes staged and clean",
    "Documentation complete (5 docs)",
    "ASHFALL phase integration verified"
  ],
  "nextSteps": [
    {
      "action": "Run Jest in isolation: npm test -- toolforge/skills/pre-wrap-audit/tests/",
      "deadline": "Before termination",
      "severity": "BLOCKER"
    },
    {
      "action": "Verify submodule state: git status",
      "deadline": "Before termination",
      "severity": "BLOCKER"
    }
  ],
  "userAcceptance": {
    "verdict": "YELLOW",
    "acceptedAt": "2026-07-08T15:35:00Z",
    "userStatement": "I accept YELLOW: regression untested; will monitor canary for 1 week"
  }
}
```

---

## Part 2: Test Cases

### 2.1 Unit Tests: Session Handler

**File:** `.claude/harness/tests/session-end-handler.test.ts`

```typescript
import { handleSessionEnd } from '../session-end-handler';
import { MockSessionContext } from './mocks';

describe('handleSessionEnd', () => {
  let session: SessionContext;

  beforeEach(() => {
    session = new MockSessionContext();
  });

  describe('RED verdict', () => {
    it('should block termination when pre-wrap-audit returns RED', async () => {
      // Mock audit to return RED
      mockTriggerSkill('pre-wrap-audit', {
        auditReport: {
          verdict: 'RED',
          blockers: ['Jest never ran'],
          risks: [],
          ready: [],
          nextSteps: [{ action: 'Run Jest', severity: 'BLOCKER' }]
        }
      });

      // Mock ASHFALL to fail if called
      mockTriggerSkill('ashfall', () => {
        throw new Error('ASHFALL should not be called on RED verdict');
      });

      await handleSessionEnd('user-finish', session);

      // Verify session NOT ended
      expect(session.ended).toBe(false);
      expect(session.metadata.auditBlockers).toEqual(['Jest never ran']);
    });

    it('should display blockers to operator', async () => {
      const blockers = [
        'Jest never executed',
        'Credentials exposed: API_KEY'
      ];
      mockAuditReport('RED', { blockers });

      const consoleSpy = jest.spyOn(console, 'error');
      await handleSessionEnd('user-finish', session);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🛑 RED FLAG')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Jest never executed')
      );
    });
  });

  describe('YELLOW verdict', () => {
    it('should prompt user for risk acceptance', async () => {
      const risks = ['Regression untested', 'Load test incomplete'];
      mockAuditReport('YELLOW', { risks });

      const promptSpy = jest
        .spyOn(global, 'promptUserForInput')
        .mockResolvedValue('I accept YELLOW: regression untested; will test in canary');

      await handleSessionEnd('user-finish', session);

      expect(promptSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  YELLOW FLAG')
      );
      expect(session.metadata.auditYellowAcceptance).toBeDefined();
      expect(session.ended).toBe(true); // Should end after acceptance
    });

    it('should keep session open if user declines YELLOW', async () => {
      mockAuditReport('YELLOW', { risks: ['Regression untested'] });

      jest
        .spyOn(global, 'promptUserForInput')
        .mockResolvedValue('no, skip this'); // Invalid

      await handleSessionEnd('user-finish', session);

      expect(session.ended).toBe(false);
    });
  });

  describe('GREEN verdict', () => {
    it('should proceed to ASHFALL and end session', async () => {
      mockAuditReport('GREEN', {
        blockers: [],
        risks: [],
        ready: ['All checks pass']
      });

      const ashfallSpy = jest.spyOn(triggerSkill, 'mock');

      await handleSessionEnd('user-finish', session);

      expect(ashfallSpy).toHaveBeenCalledWith('ashfall', expect.any(Object));
      expect(session.ended).toBe(true);
    });
  });

  describe('Audit skill failure', () => {
    it('should proceed to ASHFALL if audit errors (fail-open)', async () => {
      mockTriggerSkill('pre-wrap-audit', () => {
        throw new Error('Audit skill unavailable');
      });

      const ashfallSpy = jest.spyOn(triggerSkill, 'mock');

      await handleSessionEnd('user-finish', session);

      expect(ashfallSpy).toHaveBeenCalledWith('ashfall', expect.any(Object));
      expect(session.ended).toBe(true); // Fail-open: still end
    });
  });

  describe('Code change detection', () => {
    it('should run audit if session has modified files', async () => {
      mockGitStatus('M src/index.ts\nM package.json');
      mockAuditReport('GREEN');

      const auditSpy = jest.spyOn(triggerSkill, 'mock');

      await handleSessionEnd('timeout', session); // NOT user-finish

      expect(auditSpy).toHaveBeenCalledWith(
        'pre-wrap-audit',
        expect.any(Object)
      );
    });

    it('should skip audit if session has no changes', async () => {
      mockGitStatus(''); // No changes
      const auditSpy = jest.spyOn(triggerSkill, 'mock');

      await handleSessionEnd('timeout', session);

      expect(auditSpy).not.toHaveBeenCalledWith('pre-wrap-audit', expect.any(Object));
    });
  });
});
```

---

### 2.2 Integration Tests: /finish Command

**File:** `.claude/harness/tests/finish-command.test.ts`

```typescript
import { handleFinishCommand } from '../cli/finish-command';
import { MockSessionContext } from './mocks';

describe('/finish command', () => {
  let session: SessionContext;

  beforeEach(() => {
    session = new MockSessionContext();
  });

  it('should run audit on /finish with code changes', async () => {
    mockGitStatus('M src/index.ts');
    mockAuditReport('GREEN');

    const auditSpy = jest.spyOn(triggerSkill, 'mock');

    await handleFinishCommand([], session);

    expect(auditSpy).toHaveBeenCalledWith('pre-wrap-audit', expect.any(Object));
    expect(session.ended).toBe(true);
  });

  it('should handle /finish --skip-audit', async () => {
    mockGitStatus('M src/index.ts');

    const auditSpy = jest.spyOn(triggerSkill, 'mock');

    await handleFinishCommand(['--skip-audit'], session);

    expect(auditSpy).not.toHaveBeenCalledWith('pre-wrap-audit', expect.any(Object));
    expect(session.metadata.auditSkipped).toBe(true);
    expect(session.ended).toBe(true);
  });

  it('should require reason for /finish --override-red', async () => {
    const consoleSpy = jest.spyOn(console, 'error');

    await handleFinishCommand(['--override-red'], session);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('--override-red requires --reason')
    );
  });

  it('should accept /finish --override-red --reason="..."', async () => {
    mockAuditReport('RED', { blockers: ['Jest never ran'] });
    mockGitStatus('M src/index.ts');

    await handleFinishCommand(
      ['--override-red', '--reason="Stakeholder-approved exception"'],
      session
    );

    expect(session.metadata.auditOverride).toBeDefined();
    expect(session.metadata.auditOverride.reason).toContain('Stakeholder');
  });
});
```

---

### 2.3 E2E Test: Full Audit → ASHFALL → End

**File:** `.claude/harness/tests/e2e-finish-audit-ashfall.test.ts`

```typescript
describe('E2E: /finish → audit → ASHFALL → session end', () => {
  it('should complete full cycle with GREEN verdict', async () => {
    const session = new MockSessionContext();
    mockGitStatus('M src/index.ts\nM tests/test.ts');
    mockAuditReport('GREEN', {
      blockers: [],
      risks: [],
      ready: [
        'Code changes staged',
        'Tests pass',
        'Docs updated',
        'No secrets exposed'
      ]
    });
    mockAshfallSuccess();

    await handleFinishCommand([], session);

    // Verify full flow
    expect(session.metadata.auditReport.verdict).toBe('GREEN');
    expect(session.metadata.auditReport.ready.length).toBeGreaterThan(0);
    expect(session.ended).toBe(true);
  });

  it('should block RED verdict and keep session open', async () => {
    const session = new MockSessionContext();
    mockGitStatus('M src/index.ts');
    mockAuditReport('RED', {
      blockers: ['Jest never ran', 'Credentials exposed: API_KEY'],
      risks: [],
      nextSteps: [
        { action: 'Run: npm test', severity: 'BLOCKER' },
        { action: 'Remove API_KEY from .env', severity: 'BLOCKER' }
      ]
    });

    await handleFinishCommand([], session);

    expect(session.metadata.auditBlockers.length).toBe(2);
    expect(session.ended).toBe(false); // Session NOT ended
  });

  it('should accept YELLOW and proceed to ASHFALL', async () => {
    const session = new MockSessionContext();
    mockGitStatus('M src/index.ts');
    mockAuditReport('YELLOW', {
      risks: ['Regression untested', 'Load test incomplete']
    });
    mockAshfallSuccess();
    jest
      .spyOn(global, 'promptUserForInput')
      .mockResolvedValue(
        'I accept YELLOW: regression untested; will monitor canary for 1 week'
      );

    await handleFinishCommand([], session);

    expect(session.metadata.auditYellowAcceptance).toBeDefined();
    expect(session.ended).toBe(true);
  });
});
```

---

## Part 3: Deployment Checklist

### Phase 1: Foundation (Week 1)

- [ ] Merge pre-wrap-audit skill to main
- [ ] Merge ASHFALL + pre-wrap-audit integration
- [ ] Implement session-end-handler.ts
- [ ] Implement CLI /finish command integration
- [ ] Deploy behind feature flag (AUDIT_ENABLED=false by default)
- [ ] Write unit tests (80%+ coverage)
- [ ] Write E2E tests (3+ core flows)
- [ ] Internal canary: test with Claude Code team only

**Success criteria:**
- Unit tests 80%+ pass
- E2E tests 100% pass
- Audit runs, verdict logged, no blocking
- No crashes or hangs on /finish

### Phase 2: Canary (Week 2)

- [ ] Enable feature flag for 10% of users
- [ ] Monitor false positive rate (RED on good deployments)
- [ ] Track verdict distribution (RED/YELLOW/GREEN %)
- [ ] Gather user feedback on audit UX
- [ ] Refine verdict logic if needed
- [ ] Train operators (Chris, on-call)

**Success criteria:**
- False positive rate < 5% (RED flags on actually-good sessions)
- 90%+ of YELLOW verdicts correctly identified risks
- User confusion < 10% (tracked via support tickets)
- No session crashes

### Phase 3: Full Rollout (Week 3)

- [ ] Enable for all users
- [ ] RED flags block deployment (mandatory)
- [ ] YELLOW flags require explicit user acceptance
- [ ] Monitor prod metrics daily
- [ ] Support team ready for escalations

**Success criteria:**
- Deployment blocked on RED flags
- User acceptance rate on YELLOW > 80%
- MTTR (mean time to fix RED) < 2 hours
- No regression in session quality

---

## Part 4: Metrics & Monitoring

### Metrics to Track (Daily)

```
audit_runs_total          # Sessions where audit ran
audit_verdict_red         # RED flags found
audit_verdict_yellow      # YELLOW flags (risks)
audit_verdict_green       # GREEN (all pass)
audit_false_positive_rate # RED on good deployments
audit_yellow_acceptance   # % of YELLOW user accepts
audit_user_confusion      # Support tickets mentioning audit
ashfall_calls_post_audit  # ASHFALL runs after audit
session_blocked_count     # Sessions blocked by RED
session_override_count    # RED overrides requested
```

### Dashboard (For Infra Lead)

```
Today's Audits
  Total: 42
  GREEN: 32 (76%)
  YELLOW: 8 (19%)
  RED: 2 (5%)

Top Blockers (This Week)
  1. Jest never ran (15%)
  2. Regression untested (12%)
  3. Submodule dirty (8%)
  4. Docs out of sync (7%)

False Positive Rate
  Definition: RED flag on session that ended successfully
  This week: 2% (target: < 5%)

Operator Escalations
  This week: 3 RED (all resolved)
  Avg MTTR: 45 min (target: < 2 hours)

User Feedback
  "Audit was helpful": 87%
  "Audit was too strict": 8%
  "Audit missed something": 5%
```

---

## Part 5: Rollback Plan

If audit verdict logic has high false positive rate (> 10% RED on good deployments):

1. **Disable verdict enforcement** (1 hour)
   - AUDIT_ENFORCE=false (audit runs, only logs, no blocking)
   - Notify users: audit in "learning mode"

2. **Collect feedback** (24 hours)
   - Review all RED flags from past week
   - Interview operators & users
   - Identify false positive patterns

3. **Refine verdict rules** (3 days)
   - Adjust thresholds
   - Add exceptions for known-good patterns
   - Test on historical session data

4. **Re-enable enforcement** (Week 2)
   - AUDIT_ENFORCE=true
   - Monitor FP rate (target < 5%)

---

## See Also

- [OPERATOR-RUNBOOK.md](OPERATOR-RUNBOOK.md) — For Chris & on-call team
- [HARNESS-INTEGRATION.md](../HARNESS-INTEGRATION.md) — Original spec (high-level)
- [pre-wrap-audit Skill](../README.md)
- [EXAMPLES.md](EXAMPLES.md) — Real verdict examples
