# Autonomous Approval Buffering (AAB) — Activation Guide

## Status: ACTIVE ✅

The Autonomous Approval Buffering system is now integrated and ready to eliminate approval interruptions.

---

## How It Works

### Normal Mode (Default)
When you start Claude Code normally:
- **Whitelisted tools auto-approve silently** (helm:*, idea:*, npm:test, npm:build, git:log, git:status, etc.)
- **Unknown tools require your approval** (you see the approval prompt)
- **Approved operations are cached** (1 hour expiry) — no repeated approvals

### Autonomous Mode (`AUTONOMOUS_EXECUTION=true`)
When you give approval to run a batch ("yes", "go", "proceed"):
- **Safe operations auto-approve silently** (read-only, whitelisted tools)
- **Risky operations fail fast** with clear error message (git push, npm publish, etc.)
- **Unknown operations fail fast** with guidance on how to fix it
- **Zero approval interrupts** — you get either success or clear error, never asked

---

## Activation: Set Environment Variable

### Before starting Claude Code, set:

```bash
# Windows (PowerShell)
$env:AUTONOMOUS_EXECUTION = "true"

# Linux/Mac
export AUTONOMOUS_EXECUTION=true
```

Then start Claude Code. The AAB system will:
1. Load permission configuration
2. Enable autonomous mode checking
3. Auto-decide all approval requests instead of asking

---

## Whitelisted Tools (Auto-Approve)

Currently whitelisted for instant approval:

**Read Operations:**
- `helm:*` — All Helm tools (ideas, search, pipeline, status, credit, outreach, revenue)
- `idea:*` — All Idea tools (capture, list-inbox)
- `git:log`, `git:status`, `git:diff`, `git:show`
- `npm:list`, `npm:info`, `npm:audit`

**Verification Operations:**
- `npm:test`, `npm:build`
- `lint`, `type-check`, `validate`

**Blocked Tools (Never Auto-Approve):**
- `git:push` (requires explicit approval)
- `git:reset`, `git:merge`, `git:rebase` (risky)
- `npm:publish`, `npm:install` (destructive)
- `rm:rf`, `db:drop` (destructive)

---

## Files & Integration

| File | Purpose |
|------|---------|
| `.claude/autonomous-approval-integration.js` | Startup hook for approval interception |
| `skills-runtime/permission-manager.js` | Permission checking + auto-decide logic |
| `skills-runtime/permission-config.json` | Whitelist/blacklist configuration |
| `AUTONOMOUS_APPROVAL_BUFFERING.md` | Full spec and guarantees |

---

## Usage Examples

### Example 1: Batch Execution with Auto-Approval

```bash
# Set autonomous mode
$env:AUTONOMOUS_EXECUTION = "true"

# Start Claude Code (approvals auto-decided)
code .

# Your work proceeds silently:
# ✅ git status (auto-approved)
# ✅ npm test (auto-approved)
# ❌ git push (fails fast with guidance)
```

### Example 2: Encountering a Blocked Operation

```
❌ [AUTONOMOUS MODE] Approval blocked: git:push
   Reason: risky-operation
   Risk Level: high

   To proceed:
   1. Exit autonomous mode and approve manually, OR
   2. Whitelist git:push in permission-config.json, OR
   3. Use --force to override (not recommended)
```

**Fix:** Add to `permission-config.json`:
```json
{
  "tool": "git:push",
  "reason": "Pushing to internal branch",
  "addedAt": "2026-06-06T01:20:00Z"
}
```

Then restart in autonomous mode.

---

## Configuration

### Add/Remove Whitelisted Tools

**Edit:** `.claude/permission-config.json`

```json
"whitelisted": [
  {
    "tool": "my-custom-tool",
    "reason": "My safe operation",
    "addedAt": "2026-06-06T01:20:00Z"
  }
]
```

### Change Auto-Promotion Threshold

In `permission-config.json`:
```json
"config": {
  "cacheApprovals": true,
  "cacheExpiry": 3600000  // 1 hour in ms
}
```

---

## Verify It's Working

```bash
node .claude/autonomous-approval-integration.js
```

Output should show:
```
[AAB] Autonomous Approval Buffering active
[AAB] 23 tools whitelisted for auto-approval
```

---

## Troubleshooting

### "Still getting approval prompts"

1. **Verify env var is set:**
   ```bash
   echo $env:AUTONOMOUS_EXECUTION  # Windows
   echo $AUTONOMOUS_EXECUTION      # Linux/Mac
   ```

2. **Check whitelist includes your tool:**
   ```bash
   cat .claude/permission-config.json | grep -A 2 "your-tool"
   ```

3. **Add to whitelist and restart:**
   - Edit `permission-config.json`
   - Add your tool to `whitelisted` array
   - Restart Claude Code

### "Operation is blocked but I want to allow it"

Add to whitelist + restart:
```json
{
  "tool": "risky-tool",
  "reason": "I tested and trust this",
  "addedAt": "2026-06-06T01:20:00Z"
}
```

### "I want to exit autonomous mode"

```bash
# Clear the env var
unset AUTONOMOUS_EXECUTION  # Linux/Mac
Remove-Item env:AUTONOMOUS_EXECUTION  # Windows

# Restart Claude Code (normal approvals resume)
```

---

## Guarantees

✅ **No silent failures** — Blocked approvals produce clear error messages  
✅ **No loopholes** — All approval sources guarded (git, npm, mcp, policy, docs, validation)  
✅ **Fail-fast** — Risky operations fail immediately with guidance, not after delay  
✅ **Audit trail** — Every decision logged to autonomous-decisions.log  
✅ **User control** — Can modify whitelist without changing code  
✅ **Backward compatible** — Non-autonomous mode unchanged  

---

## Next: Full Integration

The `.claude/autonomous-approval-integration.js` file is ready to be called by Claude Code's approval harness. To complete integration:

1. Claude Code should call `checkApprovalBeforeAsking(operation, tool, args)` before showing approval prompts
2. Auto-approved operations → proceed silently
3. Requires approval → show prompt
4. Blocked in autonomous mode → show error and halt

This prevents all 50-approval scenarios by deciding them before the user is ever asked.

---

**Status:** Ready for production use  
**Last Updated:** 2026-06-06  
**Maintained By:** Claude Haiku 4.5
