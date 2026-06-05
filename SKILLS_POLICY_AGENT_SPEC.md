# Skills Policy Agent — Governance Framework

**Status:** ✅ **APPROVED** — Ready to implement (Tier 1, implement first)  
**Timeline:** 2-3 hours (standalone, can run in parallel with 44.4/45)  
**Owner:** Claude Code Engineering  
**Date Blocked:** 2026-06-05  
**Requirement Source:** Antigravity Mandate on shared skills library governance

---

## Executive Summary

A policy enforcement agent that prevents CLI tools from creating local, ad-hoc skills. Every new skill must be evaluated against a set of criteria:

1. **Is this skill generalizable?** (Reusable by other CLIs/services)
2. **Does this skill solve a platform problem?** (Not CLI-specific)
3. **Is this skill production-ready?** (Tests, schema, docs)

If criteria are met: **Add to shared library** (`skills/`).  
If not met: **Mark as CLI-native** and document exception in `SKILLS_EXCEPTIONS.md`.

---

## Problem Statement

**Before:** Developers create ad-hoc skills in `/cli-local-skills`, `/tools/custom-skills`, etc. Over time:
- Duplicate skills across different CLIs
- Skills never promoted to shared library
- Maintenance burden = N copies of same logic
- Discoverability is impossible
- Orchestrator can't use them (not in shared runtime)

**After:** All new skills evaluated upfront. Criteria-based decision on library vs local. Exception list maintained for CLI-specific skills.

---

## Architecture

### Policy Agent Execution Points

```
Developer writes new skill
         ↓
Pre-commit hook triggers
         ↓
Skills Policy Agent runs
         ↓
┌────────┴────────┐
├─────┬──────┬────┤
│     │      │    │
v     v      v    v
[Check criteria]
     │
  PASS or FAIL?
     │
  ┌──┴──┐
  │     │
  ✅   ❌
  │     │
  │     └─→ Needs exception
  │            ↓
  │         Review & approve in PR
  │            ↓
  │         Add to SKILLS_EXCEPTIONS.md
  │            ↓
  └────────→ Commit allowed
```

### Policy Agent Modules

#### 1. **Criterion Evaluator** (400 lines)

Evaluates 6 criteria:

```javascript
const evaluator = new CriterionEvaluator({
  rules: {
    'generalizability': {
      weight: 0.25,
      check: (skillCode) => analyzeDependencies(skillCode),
      acceptable: (score) => score >= 0.7
    },
    'schema-completeness': {
      weight: 0.20,
      check: (schemaFile) => validateSchema(schemaFile),
      acceptable: (isValid) => isValid === true
    },
    'test-coverage': {
      weight: 0.20,
      check: (testFile) => calculateCoverage(testFile),
      acceptable: (coverage) => coverage >= 0.80
    },
    'documentation': {
      weight: 0.15,
      check: (readmeFile) => assessDocs(readmeFile),
      acceptable: (score) => score >= 0.6
    },
    'production-readiness': {
      weight: 0.15,
      check: (skillCode, testFile) => checkErrorHandling(skillCode, testFile),
      acceptable: (isReady) => isReady === true
    },
    'non-cli-specific': {
      weight: 0.05,
      check: (skillCode, skillDesc) => detectCLISpecificity(skillCode, skillDesc),
      acceptable: (isCLISpecific) => isCLISpecific === false
    }
  }
})

const verdict = evaluator.evaluate(newSkillPath)
// → {
//   overallScore: 0.82,
//   passed: true,
//   criteria: {
//     generalizability: { score: 0.75, passed: true },
//     schemaCompleteness: { score: 1.0, passed: true },
//     testCoverage: { score: 0.85, passed: true },
//     documentation: { score: 0.70, passed: true },
//     productionReadiness: { score: 0.90, passed: true },
//     nonCLISpecific: { score: 0.95, passed: true }
//   },
//   recommendation: 'APPROVE_FOR_SHARED_LIBRARY',
//   reasoning: 'Skill meets all criteria. Generalizable, well-tested, documented.'
// }
```

**Criterion Definitions:**

##### Generalizability (0.25 weight)
- Analyzes imports/dependencies
- Checks for CLI-specific modules (yargs, commander, fs, path)
- Analyzes parameter names and types
- Scores: 0.0 (pure CLI) → 1.0 (pure logic)
- **Acceptable:** score >= 0.7

##### Schema Completeness (0.20 weight)
- Validates against JSON Schema spec
- Checks for required fields: type, properties, required
- Verifies all params have descriptions
- Validates type constraints
- **Acceptable:** valid JSON schema

##### Test Coverage (0.20 weight)
- Parses test file (vitest format)
- Calculates coverage by line count
- Requires minimum 80% coverage
- Checks error cases, edge cases
- **Acceptable:** coverage >= 80%

##### Documentation (0.15 weight)
- Checks for README.md
- Analyzes: purpose, inputs, outputs, examples
- Readability scoring (clarity, length)
- **Acceptable:** score >= 0.6 (has purpose + examples)

##### Production Readiness (0.15 weight)
- Checks for error handling (try/catch, validation)
- Verifies logging present
- Checks schema validation at entry
- Detects code smells (console.log, hardcoded values)
- **Acceptable:** no critical issues

##### Non-CLI-Specific (0.05 weight)
- Scans for CLI-specific patterns:
  - process.argv, process.exit
  - CLI argument parsing
  - TTY/terminal operations
  - fs.watch, file system monitoring
- **Acceptable:** no CLI-specific code

---

#### 2. **Exception Manager** (250 lines)

Manages the exception list (`SKILLS_EXCEPTIONS.md`):

```markdown
# Skills Exceptions Registry

When a skill fails policy evaluation but is still valuable as CLI-native, it's registered here.

## Exception Entry Format

```
### Skill: {name}
- **Reason:** {why it's CLI-specific}
- **Approved By:** {reviewer GitHub handle}
- **Date:** {YYYY-MM-DD}
- **Review URL:** {PR or issue link}
- **Sunset Date:** {YYYY-MM-DD or "never"}
```

## Active Exceptions

### Skill: cli-version-checker
- **Reason:** Reads ./package.json and ./node_modules to detect CLI version. Not generalizable.
- **Approved By:** @soren
- **Date:** 2026-06-05
- **Review URL:** https://github.com/.../pull/1234
- **Sunset Date:** never

### Skill: terminal-colors
- **Reason:** Applies ANSI color codes specific to TTY output. Not applicable in non-terminal contexts.
- **Approved By:** @soren
- **Date:** 2026-06-05
- **Review URL:** https://github.com/.../pull/1235
- **Sunset Date:** never

### Skill: interactive-prompt
- **Reason:** Uses readline for interactive user input. Not compatible with headless execution.
- **Approved By:** @soren
- **Date:** 2026-06-05
- **Review URL:** https://github.com/.../pull/1236
- **Sunset Date:** never
```

**API:**

```javascript
const exceptions = new ExceptionManager('SKILLS_EXCEPTIONS.md')

// Check if skill has exception
exceptions.hasException('cli-version-checker')
// → true

// Get exception details
exceptions.getException('cli-version-checker')
// → {
//   name: 'cli-version-checker',
//   reason: '...',
//   approvedBy: '@soren',
//   date: '2026-06-05',
//   reviewUrl: '...',
//   sunsetDate: 'never'
// }

// Add exception (requires reviewer approval in PR)
exceptions.addException({
  name: 'new-cli-skill',
  reason: 'Reads terminal width for formatting',
  approvedBy: '@reviewer-handle',
  date: '2026-06-05',
  reviewUrl: 'https://github.com/.../pull/1237',
  sunsetDate: '2026-12-31' // optional: flag for future review
})

// List all exceptions
exceptions.list()
// → [{ name, reason, ... }, ...]
```

---

#### 3. **Pre-Commit Hook** (150 lines)

Installed in `.husky/pre-commit` to block commits of non-compliant skills:

```bash
#!/bin/bash
# .husky/pre-commit

echo "🔍 Checking new skills against policy..."

# Find new skill directories
NEW_SKILLS=$(git diff --cached --name-only | grep -E '^skills/[^/]+/(index\.js|schema\.json)$' | cut -d/ -f2 | sort | uniq)

if [ -z "$NEW_SKILLS" ]; then
  exit 0
fi

# Run policy evaluator for each skill
for skill in $NEW_SKILLS; do
  echo "Evaluating skill: $skill"
  node tools/policy-agent/evaluate-skill.js "skills/$skill"
  
  if [ $? -ne 0 ]; then
    echo "❌ Skill '$skill' failed policy evaluation."
    echo "   Options:"
    echo "   1. Fix the skill (tests, docs, schema)"
    echo "   2. Request exception in PR: add to SKILLS_EXCEPTIONS.md"
    echo "   3. Mark as CLI-native in separate directory: cli-local-skills/"
    exit 1
  fi
done

echo "✅ All skills passed policy evaluation."
exit 0
```

---

#### 4. **CLI Validator** (300 lines)

Analyzes code to detect CLI-specific patterns:

```javascript
class CLIValidator {
  detectCLIPatterns(code) {
    const patterns = [
      { name: 'process.argv', regex: /process\.argv/, severity: 'critical' },
      { name: 'process.exit', regex: /process\.exit/, severity: 'critical' },
      { name: 'yargs|commander', regex: /require\(['"](?:yargs|commander)['"]/, severity: 'critical' },
      { name: 'readline|prompt', regex: /require\(['"]readline['"]/, severity: 'critical' },
      { name: 'tty.isatty', regex: /tty\.isatty|process\.stdout\.isTTY/, severity: 'high' },
      { name: 'console.log', regex: /console\.(log|info|error|warn)/, severity: 'medium' },
      { name: 'fs.watch', regex: /fs\.watch/, severity: 'medium' },
      { name: 'child_process', regex: /require\(['"]child_process['"]/, severity: 'high' }
    ]
    
    const detected = patterns
      .filter(p => p.regex.test(code))
      .map(p => ({ ...p, found: true }))
    
    return {
      hasCliPatterns: detected.length > 0,
      patterns: detected,
      severity: detected.some(p => p.severity === 'critical') ? 'critical' : 
                detected.some(p => p.severity === 'high') ? 'high' : 'medium'
    }
  }
}
```

---

#### 5. **Policy Report Generator** (200 lines)

Generates reports for human review:

```javascript
const report = policyAgent.generateReport(skillPath)
// → {
//   skillName: 'new-skill',
//   timestamp: '2026-06-05T12:34:56Z',
//   verdict: 'APPROVE_FOR_LIBRARY',
//   overallScore: 0.88,
//   criteria: {...},
//   warnings: [
//     'Schema has 1 undocumented parameter'
//   ],
//   recommendations: [
//     'Add README.md with example usage'
//   ],
//   nextSteps: [
//     'Commit to skills/ directory',
//     'Add to skill manifest (skill-tool-config.json)',
//     'Deploy via standard process'
//   ],
//   reportPath: 'reports/policy/new-skill-2026-06-05.md'
// }
```

---

## Integration Points

1. **Git Pre-Commit Hook** — Blocks commits of non-compliant skills
2. **CLI Creation Workflow** — Guides developer decision
3. **PR Template** — Includes policy checklist
4. **SUGGESTION_LOG.md** — Records policy decisions
5. **Dashboard** — Shows exception list and upcoming sunset dates

---

## Workflow: Creating a New Skill

### Scenario 1: Skill Passes Policy

```
Developer: Writes skills/my-new-skill/{index.js, schema.json, index.test.js}
           ↓
Pre-commit hook: Evaluates skill
           ↓
Policy verdict: ✅ PASS (score 0.85)
           ↓
Developer: Commits to skills/ directory
           ↓
CI/CD: Deploys to shared library
           ↓
All CLIs: Can now use skill
```

### Scenario 2: Skill Fails Policy (Missing Tests)

```
Developer: Writes skills/my-cli-skill/{index.js, schema.json}
           ↓
Pre-commit hook: Evaluates skill
           ↓
Policy verdict: ❌ FAIL (score 0.55, test coverage 0%)
           ↓
Hook blocks: "Test coverage must be >= 80%"
           ↓
Developer Option A: Add tests (recommended)
         Option B: Request exception (requires PR approval)
         Option C: Move to cli-local-skills/ (give up shared library)
           ↓
If Option A: Add 15 tests → hook passes → commit
If Option B: Add to SKILLS_EXCEPTIONS.md → PR review → approved → commit
If Option C: Move files → commit to cli-local-skills/
```

### Scenario 3: CLI-Specific Skill

```
Developer: Writes interactive-form skill (reads TTY, uses readline)
           ↓
Pre-commit hook: Evaluates skill
           ↓
CLI validator: ❌ Detects readline and tty.isatty
           ↓
Policy verdict: FAIL (non-CLI-specific score 0.2)
           ↓
Hook suggests: "This looks like CLI-native. File an exception or move to cli-local-skills/"
           ↓
Developer Option A: Remove CLI specifics (refactor)
         Option B: Request exception in PR
         Option C: Keep local only
           ↓
If Option A: Refactor → remove readline → hook passes
If Option B: Create exception entry → PR approval → SKILLS_EXCEPTIONS.md → commit
If Option C: Move to cli-local-skills/ → commit
```

---

## Decision Matrix

| Situation | Action | CLI Tool Behavior |
|-----------|--------|------------------|
| Passes all criteria | Add to skills/ | Available in shared runtime + orchestrator |
| Fails criteria, not CLI-specific | Reject until fixed | Developer must improve (tests, docs, schema) |
| Fails criteria, is CLI-native | Request exception | Allowed in cli-local-skills/, not in orchestrator |
| Exception approved | Add to SKILLS_EXCEPTIONS.md | Documented as intentional exception |
| Exception has sunset date | Quarterly review | Flag for re-evaluation after sunset |

---

## Configuration

**File:** `tools/policy-agent/config.json`

```json
{
  "criteria": {
    "generalizability": { "weight": 0.25, "minScore": 0.70 },
    "schemaCompleteness": { "weight": 0.20, "required": true },
    "testCoverage": { "weight": 0.20, "minCoverage": 0.80 },
    "documentation": { "weight": 0.15, "minScore": 0.60 },
    "productionReadiness": { "weight": 0.15, "required": true },
    "nonCLISpecific": { "weight": 0.05, "required": true }
  },
  "passThreshold": 0.70,
  "cliPatterns": [
    "process.argv",
    "process.exit",
    "yargs",
    "commander",
    "readline",
    "tty.isatty"
  ],
  "exceptionRegistry": "SKILLS_EXCEPTIONS.md",
  "reportDir": "reports/policy",
  "enabled": true
}
```

---

## Testing Strategy

- **Unit Tests:** Criterion evaluators, validators, exception manager (45 tests)
- **Integration Tests:** Pre-commit hook + sample skills (12 tests)
- **Scenario Tests:** Decision matrix workflows (8 tests)

---

## Success Criteria

- ✅ All new skills evaluated before commit
- ✅ Shared library contains only production-ready, generalizable skills
- ✅ CLI-native exceptions documented with reasoning
- ✅ Zero ad-hoc local skills outside of exceptions
- ✅ Dashboard shows exception list + sunset dates
- ✅ Policy enforcement transparent to developers

---

## Blockers & Prerequisites

- ✅ Phase 44.0-44.5 complete
- ⏳ Approval to proceed
- ⏳ CLI tool templates updated to reference this policy

**Status:** 🔴 BLOCKED — Waiting for approval

---

## Files to Create/Modify

**New:**
- `tools/policy-agent/criterion-evaluator.js` (400 lines)
- `tools/policy-agent/exception-manager.js` (250 lines)
- `tools/policy-agent/cli-validator.js` (300 lines)
- `tools/policy-agent/policy-report-generator.js` (200 lines)
- `tools/policy-agent/evaluate-skill.js` (150 lines, CLI entry point)
- `tools/policy-agent/config.json` (config)
- `tools/policy-agent/index.test.js` (65 tests)
- `.husky/pre-commit` (policy agent hook)
- `SKILLS_EXCEPTIONS.md` (exception registry)
- `SKILLS_POLICY_AGENT.md` (user guide)

**Modify:**
- `.github/pull_request_template.md` (add policy checklist)
- `package.json` (add `npm run policy:check` and `npm run policy:report`)

---

## CLI Commands

```bash
# Check a single skill
npm run policy:check -- skills/my-new-skill

# Generate policy report
npm run policy:report -- skills/my-new-skill --format=markdown

# List exceptions
npm run policy:exceptions -- list

# Add exception (requires --approver flag)
npm run policy:exceptions -- add --name=cli-skill --approver=@soren --reason="TTY-specific" --review-url="https://..."

# Audit all skills
npm run policy:audit

# Check for sunset dates
npm run policy:audit -- --check-sunsets
```

---

**Next Step:** Approve Skills Policy Agent to proceed with implementation
