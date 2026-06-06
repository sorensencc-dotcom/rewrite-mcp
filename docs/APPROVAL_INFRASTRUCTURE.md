# Approval Infrastructure & Records

**Last Updated:** 2026-06-06  
**Maintained By:** Claude (policy validator layer)

## Overview

Three approval systems operate in rewrite-mcp:

1. **Tool Permission Approvals** — MCP tools, npm, git, policy operations
2. **Code Review Approvals** — Zone violations, bundle violations, cross-zone changes  
3. **Policy Validation** — Real-time blocking at commit time (NEW, Phase E.0)

---

## 1. Tool Permission Approvals

**Location:** `skills-runtime/approval-cache.json`  
**Type:** Caching layer for MCP/CLI tool access decisions  
**Updated By:** permission-manager.js during tool invocation

### Structure

```json
{
  "version": "1.0.0",
  "approvals": {
    "operation:tool:subcommand": {
      "operation": "deploy|call|query|search|etc",
      "tool": "npm:deploy|helm:ideas-summary|etc",
      "approved": true,
      "reason": "manual|whitelisted|autonomous:auto-approved",
      "approvedAt": "2026-06-06T00:10:04.901Z"
    }
  },
  "stats": {
    "totalRequests": 392,
    "autoApproved": 67,
    "cachedApprovals": 0,
    "manualApprovals": 2
  }
}
```

### Whitelist System

**Location:** `skills-runtime/permission-config.json`  
**Purpose:** Pre-configured safe operations that don't require approval

**Current whitelist:**
- `helm:*` (read-only dashboards)
- `idea:capture`, `idea:list-inbox` (safe operations)
- `npm:build`, `npm:test`, `git:status`, `git:log` (safe CLI operations)

---

## 2. Code Review Approvals (Legacy)

**Problem:** User reported "50+ approval clicks before lunch" for code review.

**Root Cause:** Zone violations and file bundling violations were approved AFTER commit instead of being blocked BEFORE commit.

**Example:** 
- Developer commits files from `apps/cic-pms/` (Claude-owned) + `tools/` (Claude-owned but different zone context)
- Pre-commit hook was auto-staging ALL files (`git add -A`)
- Approval system saw the violation and required manual approval
- User had to approve dozens of bundles that shouldn't have been created in the first place

**No single approval log for this** — the approvals were happening in a UI (likely Claude Code MCP approval modal).

---

## 3. Policy Validation (NEW — Phase E.0)

**Location:** `.husky/prepare-commit-msg` hook  
**Validator:** `tools/git-policy-agent/PolicyValidator.js`  
**Trigger:** Every `git commit` (BEFORE commit is created)

### How it Works

1. User attempts: `git commit -m "[claude] Feature X"`
2. Git invokes `.husky/prepare-commit-msg` hook
3. Hook calls: `node tools/git-policy-agent/validate-commit.js <msg-file> <repo-root>`
4. PolicyValidator reads `AGENTS.md` zone rules
5. Checks:
   - ✅ Tool prefix `[claude|copilot|gemini|human]` present
   - ✅ Staged files match zone owner
   - ✅ No files from different zones bundled together
6. Result:
   - **PASS:** Commit proceeds (exit 0)
   - **FAIL:** Commit blocked (exit 1), clear error message

### Benefits vs. Legacy Approval System

| Aspect | Legacy (UI Approvals) | Policy Validator (Real-Time) |
|--------|----------------------|------------------------------|
| **Timing** | After commit created | BEFORE commit created |
| **Prevention** | Reactive (approve violations) | Proactive (block violations) |
| **User Friction** | 50+ clicks to approve violations | 0 clicks (violations blocked at source) |
| **Determinism** | Manual decision per violation | Automated, rule-based (AGENTS.md) |
| **Audit Trail** | UI approval logs (not centralized) | Git history + commit message |

---

## Audit Analysis: 50+ Approval Clicks

**To understand which approvals were policy-driven:**

1. **Extract approval times** from git log (commit times)
2. **Check zone violations** in commits before PolicyValidator was deployed
3. **Count approvals** that matched zone violations in `AGENTS.md`
4. **Estimate impact** of PolicyValidator (approvals that would have been blocked)

**No structured approval log exists** because the system was reactive (approve after the fact). The PolicyValidator is proactive: violations never create commits, so there's nothing to approve.

---

## Future: Approval Audit Trail

To make approval auditing easier in future, add:

```json
// .git-approval-audit.jsonl (append-only log)
{
  "timestamp": "2026-06-06T12:34:56.789Z",
  "commitHash": "abc123def456",
  "tool": "claude",
  "zones": ["apps/cic-pms/src/", "tools/"],
  "violations": ["cross-zone-bundling"],
  "blocked": true,
  "reason": "Zone conflict detected by PolicyValidator"
}
```

This would provide a permanent audit trail of violations blocked by the policy validator.

---

## Files to Check Next Session

- `approval-cache.json` — Current tool permission approvals
- `.husky/prepare-commit-msg` — Active policy validation hook
- `tools/git-policy-agent/PolicyValidator.js` — Zone validation logic
- `AGENTS.md` — Zone ownership rules (source of truth)

**Q: How do I know if the policy validator is working?**  
A: Run `git commit -m "[invalid] Test"` — it will block with error message about missing valid tool prefix.

---

## References

- [[phase-e-realtime-policy-validator]] — Implementation details
- `AGENTS.md` — Zone governance rules
- `.husky/prepare-commit-msg` — Git hook entry point
- `tools/git-policy-agent/` — Validator implementation
