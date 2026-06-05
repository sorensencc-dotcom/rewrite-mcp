# Approval Friction Analysis & Solution

**Problem:** 200+ manual approvals per day, causing significant friction and hand strain.

**Root Causes (Hypothesis):**
1. **MCP Tool Calls** — Every call to `helm:*`, `idea:*` tools requires approval
2. **Git Operations** — Every git operation (commit, add, etc.) might need approval
3. **NPM Commands** — Build/test commands requiring approval
4. **Claude Code Permissions** — IDE asking for tool access on each call

---

## Solution Stack

### 1. **Approval Manifest** (Already implemented)
- **File:** `skills-runtime/approvals-manifest.json`
- **Purpose:** Auto-promotes commands at threshold=2 occurrences
- **Status:** ✅ Complete

### 2. **Permission Manager** (Just deployed)
- **File:** `skills-runtime/permission-manager.js`
- **Purpose:** Whitelists safe operations, caches approval decisions
- **Features:**
  - Whitelist/blacklist system for tools
  - Approval caching (1-hour TTL)
  - Bottleneck analysis (find what to whitelist)
  - Auto-approval recommendations

### 3. **Permission Config** (Just deployed)
- **File:** `skills-runtime/permission-config.json`
- **Purpose:** Pre-configured whitelist of safe tools
- **Current:** 11 whitelisted tools (all read-only or safe)

---

## Immediate Actions to Reduce Friction

### Step 1: Identify Approval Bottlenecks
Run the permission manager analysis:

```bash
node skills-runtime/permission-manager.js
# Shows:
# - Top tools being approved
# - Top operations causing friction
# - Recommendations for whitelisting
```

### Step 2: Whitelist High-Frequency Tools
Add any frequently-used tool to `whitelisted` array in `permission-config.json`:

```json
{
  "tool": "your-frequent-tool",
  "reason": "Frequently used, safe read operation",
  "addedAt": "2026-06-05T..."
}
```

### Step 3: Enable Approval Caching
Permission manager caches approvals for 1 hour by default. Same tool/operation = no re-ask.

---

## Approval Sources & Solutions

### Source 1: MCP Tool Approval (Claude Code)

**Current Whitelist:**
- `helm:ideas-summary` — Safe, read-only aggregation
- `helm:pri-search` — Read-only search
- `helm:rl-pipeline`, `helm:cic-status`, `helm:credit-score`, `helm:outreach-queue`, `helm:revenue-pipeline` — All read-only
- `npm:test`, `git:status`, `git:log`, `npm:list` — Safe operations

**To Reduce Further:**
1. Add any `idea:*` tools you use frequently to whitelist
2. Add build tools (`npm:build`) if auto-tested
3. Pre-approve read operations by category

### Source 2: Git Pre-Commit Hooks

**Current:** `gitleaks protect --staged --verbose` (minimal friction)

**Solution:** If gitleaks is causing issues, can whitelist specific commit types:
- Development commits (non-production)
- Documentation updates
- Safe refactors

### Source 3: Permission Gates in Code

**Files to Check:**
- `projects/cic/src/**/permission*.ts` — Any permission gates?
- `projects/cic/evolution/**/gate*.ts` — Evolution/validation gates?
- `tools/**/*guard*.js` — Any approval guards?

---

## Configuration Strategy

### Low-Risk Operations (Auto-Approve)
- Any read-only query (`helm:*`, `idea:inbox`)
- Git status/log (no modifications)
- NPM list, version checks
- Documentation updates
- Tests (npm:test)

### Medium-Risk Operations (Cache After First Approval)
- Git commits (if lint passes)
- Build operations
- Configuration updates

### High-Risk Operations (Always Require Approval)
- Git push/force
- Database operations
- Production deployments
- Secret/credential operations

---

## Next Steps

### Immediate (Today)
1. ✅ Deploy `permission-manager.js` and `permission-config.json`
2. 🔍 Run bottleneck analysis to identify your top approval sources
3. 📝 Update `permission-config.json` with frequently-used tools
4. ✔️ Commit changes

### Short-Term (This Week)
1. Monitor approval rates with the manager
2. Identify any remaining bottlenecks
3. Create approval profiles by task type (dev, doc, release)

### Long-Term (This Sprint)
1. Integrate permission manager into Claude Code startup
2. Build automated approval recommendation engine
3. Create task-specific approval contexts (fewer approvals for routine work)

---

## Files Deployed

| File | Purpose | Status |
| --- | --- | --- |
| `skills-runtime/permission-manager.js` | Core permission logic | ✅ Ready |
| `skills-runtime/permission-config.json` | Whitelist config | ✅ Ready |
| `skills-runtime/approvals-manifest.json` | Auto-promotion manifest | ✅ Ready |
| `skills-runtime/approval-handler.js` | Approval tracking | ✅ Ready |

---

## Quick Integration

To use the permission manager in your code:

```javascript
import { PermissionManager } from "./skills-runtime/permission-manager.js";

const pm = new PermissionManager();

// Check if operation needs approval
const result = pm.checkPermission("search", "helm:pri-search");
// → { requires: false, reason: "whitelisted", autoApproved: true }

// Get analysis of bottlenecks
const analysis = pm.analyzeBottlenecks();
console.log(analysis.recommendations);
// → [{ tool: "npm:build", count: 23, recommendation: "Whitelist npm:build..." }]

// Add tools to whitelist
pm.whitelist("npm:build", "Safe verification");
```

---

## Expected Impact

- **Before:** 200+ manual approvals/day
- **After (Target):** 10-20 approvals/day (only for new/risky operations)
- **Time Saved:** ~2-3 hours/day
- **Hand Strain:** Reduced by 90%+
