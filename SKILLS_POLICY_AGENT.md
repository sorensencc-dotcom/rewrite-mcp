# Skills Policy Agent — User Guide

**What is it?** A governance system that ensures all skills added to the shared library meet quality and generalizability standards.

**Why?** Prevents ad-hoc, unmaintainable local skills that duplicate effort and can't be reused by other CLIs or services.

---

## Quick Start

When you create a new skill, the policy agent automatically evaluates it before allowing commit:

```bash
# Create your skill in skills/my-new-skill/
mkdir -p skills/my-new-skill
touch skills/my-new-skill/{index.js,schema.json,index.test.js,README.md}

# Git will run policy check automatically on commit
git add skills/my-new-skill/
git commit -m "Add my-new-skill"

# ✅ If it passes → committed to shared library
# ❌ If it fails → commit blocked with guidance
```

---

## The 6 Evaluation Criteria

### 1. **Generalizability** (25% weight)
**What:** Is this skill reusable by other CLIs and services, or is it specific to one tool?

**How we measure:** 
- Checks for CLI-specific imports (yargs, commander, readline, process.argv)
- Checks for file system operations that might not work in all contexts
- Analyzes whether the core logic is platform-agnostic

**Minimum:** Score ≥ 0.70

**Examples:**
- ✅ **Good:** A skill that analyzes code quality, compares API responses, or processes data
- ❌ **Bad:** A skill that reads CLI arguments, formats terminal colors, or watches files for changes

---

### 2. **Schema Completeness** (20% weight)
**What:** Does the skill have a proper input/output schema?

**How we measure:**
- Requires valid JSON schema with `type`, `properties`, `required`
- All properties must have descriptions
- No undocumented parameters

**Minimum:** Must be present and valid

**Example schema.json:**
```json
{
  "type": "object",
  "properties": {
    "fileContent": {
      "type": "string",
      "description": "Source code to analyze"
    },
    "severity": {
      "type": "string",
      "enum": ["high", "medium", "low"],
      "description": "Minimum severity level to report"
    }
  },
  "required": ["fileContent"]
}
```

---

### 3. **Test Coverage** (20% weight)
**What:** Does the skill have comprehensive tests?

**How we measure:**
- Counts test cases
- Checks for error case coverage
- Requires 80%+ effective coverage

**Minimum:** ≥ 80% coverage with both happy path and error cases

**Example test.js:**
```javascript
describe('my-skill', () => {
  it('processes valid input', () => { /* happy path */ })
  it('rejects invalid input', () => { /* error case */ })
  it('handles missing parameters', () => { /* error case */ })
  it('handles large datasets', () => { /* edge case */ })
})
```

---

### 4. **Documentation** (15% weight)
**What:** Does the skill have clear README with purpose and examples?

**How we measure:**
- Checks for Purpose/Overview section
- Checks for Input/Parameters section
- Checks for Output/Returns section
- Checks for Examples section

**Minimum:** Score ≥ 0.60 (at least 2-3 of the 4 sections)

**Example README.md:**
```markdown
## Purpose
Analyzes code for security vulnerabilities using pattern matching.

## Input
- `code` (string): Source code to scan
- `rules` (array): Security rules to apply

## Output
- `findings` (array): List of vulnerabilities found
- `total` (number): Number of issues

## Example
\`\`\`javascript
await skill.invoke({ code: 'const x = eval(input);', rules: ['eval'] })
// → { findings: [{ type: 'eval', line: 1 }], total: 1 }
\`\`\`
```

---

### 5. **Production Readiness** (15% weight)
**What:** Is the code production-quality with proper error handling?

**How we measure:**
- Checks for try/catch or error handling
- Checks for schema validation at entry
- Checks for logging
- Detects code smells (console.log, hardcoded values, undated TODOs)

**Minimum:** Must pass (no critical issues)

**Code smells to avoid:**
- ❌ `console.log()` — use `logger.info()` instead
- ❌ Hardcoded API keys, URLs, or secrets
- ❌ `TODO` without a deadline
- ❌ Unhandled promise rejections

---

### 6. **Non-CLI-Specific** (5% weight)
**What:** Does the skill avoid CLI-specific patterns that won't work headless?

**How we measure:**
- Scans for: `process.argv`, `process.exit`, `yargs`, `commander`, `readline`, `tty.isatty`
- Scans for: file watching, terminal operations

**Minimum:** Must pass (no CLI patterns allowed)

**CLI patterns to avoid:**
- ❌ `process.argv` — CLI argument parsing
- ❌ `process.exit()` — process termination
- ❌ `readline` — interactive input
- ❌ `tty.isatty()` — TTY detection
- ❌ `fs.watch()` — file system watching

---

## Evaluation Outcomes

### ✅ **Pass** (Score ≥ 0.70 + all required criteria met)

Your skill is approved for the shared library!

```bash
npm run policy:check -- skills/my-skill
# ✅ Skill approved for shared library!
# Next steps:
# 1. Commit to skills/ directory
# 2. Add to skill manifest (skill-tool-config.json)
# 3. Deploy via standard process
```

**What happens:**
- Skill is committed to `skills/my-skill/`
- Available in shared runtime for all CLIs
- Orchestrator can invoke it
- Accessible via HTTP Gateway for Copilot/Gemini

---

### ❌ **Fail** (Score < 0.70 OR required criteria not met)

Your skill needs work. You have three options:

#### **Option A: Fix the Skill** (Recommended)
```bash
# Address the failing criteria
# - Add tests if coverage < 80%
# - Add README if docs missing
# - Fix schema if incomplete
# - Remove CLI-specific code

git add skills/my-skill/
git commit -m "Improve my-skill: add tests and docs"

# Pre-commit hook will re-evaluate
# If it passes now, commit succeeds!
```

#### **Option B: Request Exception** (For CLI-native skills)
Only use this if the skill is **truly CLI-native** and can't be generalized.

```bash
npm run policy:exceptions -- add \
  --name=my-skill \
  --approver=@reviewer-handle \
  --reason="Reads .node_modules to detect local packages" \
  --review-url="https://github.com/user/repo/pull/123" \
  --sunset-date=2026-12-31  # optional: when to revisit
```

This registers the skill as an exception:
- Creates entry in `SKILLS_EXCEPTIONS.md`
- Requires PR approval (in review comment)
- Skill lives in `cli-local-skills/` instead of `skills/`
- Not available to orchestrator or other services
- Dashboard shows sunset date for future review

#### **Option C: Move to Local Skills**
If you don't want to improve or request an exception:

```bash
# Move skill to local-only directory
mkdir -p cli-local-skills
mv skills/my-skill cli-local-skills/

# Commit separately
git add cli-local-skills/my-skill/
git rm --cached skills/my-skill/
git commit -m "Move my-skill to cli-local-skills"
```

This skill:
- Works locally in your CLI
- Won't be evaluated by policy agent
- Not available to orchestrator
- Not shared with other services

---

## Running Checks Manually

### Check a single skill
```bash
npm run policy:check -- skills/my-skill
```

**Output:**
```
📋 Policy Evaluation: my-skill

Score: 0.85 / 1.00
Status: ✅ PASS

✅ Skill approved for shared library!

Next steps:
1. Commit to skills/ directory
2. Add to skill manifest (skill-tool-config.json)
3. Deploy via standard process
```

### Generate detailed report
```bash
npm run policy:report -- skills/my-skill
```

Creates `reports/policy/my-skill-2026-06-05.md` with detailed analysis of each criterion.

### List exceptions
```bash
npm run policy:exceptions -- list
```

Shows all registered CLI-native exceptions with sunset dates.

### Add exception
```bash
npm run policy:exceptions -- add \
  --name=cli-version-checker \
  --approver=@soren \
  --reason="Reads package.json from CLI" \
  --review-url="https://github.com/repo/pull/123"
```

### Audit all skills
```bash
npm run policy:audit
```

Evaluates all skills in the `skills/` directory, shows overall compliance.

---

## Common Questions

### Q: My skill is failing because it needs to read files. Can I get an exception?

**A:** Not necessarily. If your skill analyzes file content (passed as a string parameter), it's generalizable. Only if it must directly read the file system (and can't work with passed content) is it CLI-specific.

**Good (generalizable):**
```javascript
function analyze(fileContent) { /* analyze the string */ }
```

**Bad (CLI-specific):**
```javascript
function analyze() { 
  const content = fs.readFileSync(process.argv[2]);
  /* analyze */ 
}
```

---

### Q: My skill uses `console.log`. Is that a problem?

**A:** Yes. Replace it with:
```javascript
// Instead of:
console.log('Processing file...')

// Use a logger:
const logger = require('./logger');
logger.info('Processing file...')
```

Or remove debug output entirely if not needed.

---

### Q: My skill needs to interact with the terminal (colors, spinners). Can it still be in the shared library?

**A:** Not directly. But you can create two versions:
1. **Shared library version** (`skills/my-analyzer/`) — returns data, no terminal output
2. **CLI wrapper** (`cli-local-skills/my-analyzer-terminal/`) — calls skill, formats output for terminal

This way your core logic is reusable, but CLI-specific presentation is local.

---

### Q: What if my skill fails and I don't want to fix it or request an exception?

**A:** Move it to `cli-local-skills/`. It will work locally without being part of the shared library or orchestrator. Perfectly fine for CLI-specific utilities.

---

### Q: Can I commit code if the policy check fails?

**A:** No. The pre-commit hook will block the commit and show you which criteria failed. This is intentional — it ensures only production-ready skills make it to shared library.

---

### Q: How often are exceptions re-evaluated?

**A:** Quarterly (or on the sunset date if specified). The dashboard flags exceptions with upcoming sunsets. If you set `--sunset-date=2026-12-31`, that skill gets re-evaluated on that date to see if it can now pass the policy.

---

### Q: What if I think the policy is too strict?

**A:** Open an issue. The criteria (weights, thresholds) are configurable in `tools/policy-agent/config.json`. We can adjust if the community consensus changes.

---

## Files

- `tools/policy-agent/criterion-evaluator.js` — Core evaluation logic
- `tools/policy-agent/cli-validator.js` — CLI pattern detection
- `tools/policy-agent/exception-manager.js` — Exception registry
- `tools/policy-agent/policy-report-generator.js` — Report generation
- `tools/policy-agent/evaluate-skill.js` — CLI entry point
- `tools/policy-agent/config.json` — Evaluation criteria weights
- `SKILLS_EXCEPTIONS.md` — Registry of approved CLI-native skills
- `.husky/pre-commit` — Hook that runs evaluation

---

## Commands

| Command | Purpose |
|---------|---------|
| `npm run policy:check -- skills/name` | Evaluate a skill |
| `npm run policy:report -- skills/name` | Generate detailed report |
| `npm run policy:exceptions -- list` | View exceptions |
| `npm run policy:exceptions -- add --name=... --approver=... --reason="..." --review-url="..."` | Register exception |
| `npm run policy:audit` | Audit all skills |

---

**Next:** Build your skill, commit it, let the policy agent guide you toward production-quality code! 🚀
