# Shared Skills Library — Platform Integration Notes
## v1.0.0 | 2026-06-05

Platform-specific guidance for deploying skills across Claude, Copilot, and Gemini.

---

## Quick Summary

| Skill | Claude | Copilot | Gemini | Notes |
|-------|--------|---------|--------|-------|
| **cic-section-summarizer** | ✅ Ready | ⚠️ Adapt | ⚠️ Adapt | Requires CIC repo context; no cloud APIs |
| **agent-drift-detector** | ✅ Ready | ⚠️ Adapt | ⚠️ Adapt | Schema comparison; no external calls |
| **rewrite-labs-orchestrator** | ✅ Ready | ⚠️ Adapt | ⚠️ Adapt | State tracking; JSON-based |
| **environment-diagnostics** | ✅ Ready | ⏸️ Windows-only | ❌ Unsupported | Windows/WSL-specific; Copilot only on Windows |
| **session-boundary-manager** | ✅ Ready | ✅ Ready | ✅ Ready | No platform-specific code |
| **cic-roadmap-updater** | ✅ Ready | ⚠️ Adapt | ⚠️ Adapt | CIC repo access required |
| **operator-grade-procedures** | ✅ Ready | ⚠️ Adapt | ⚠️ Adapt | Generic task, platform-neutral |
| **web-regression** | ✅ Deployed | ⚠️ Adapt | ⚠️ Adapt | Bash script; needs PowerShell equivalent for Copilot |
| **research-capture** | ✅ Deployed | ❌ Unsupported | ⚠️ Adapt | Documentary project context (CIC-specific) |
| **treatment-update** | ✅ Deployed | ❌ Unsupported | ❌ Unsupported | CIC-specific; docx file handling |
| **doc-update** | ✅ Deployed | ⚠️ Adapt | ⚠️ Adapt | Generic; needs platform-specific doc tools |
| **docs-sync-release** | ✅ Deployed | ⚠️ Adapt | ⚠️ Adapt | npm-based; needs platform wrappers |
| **approvals-audit** | ✅ Deployed | ❌ Unsupported | ❌ Unsupported | Claude Code-specific logging |

---

## Claude (Primary Platform)

### Status
✅ **All 13 skills ready** — No platform-specific changes needed.

### Deployment
1. Copy skill directories to `~/.claude/projects/c--dev/skills/`
2. Register in `settings.json` with enabled flag
3. Test via Claude Code or Claude Desktop

### Integration Points
- **MCP Servers:** Idea-inbox, Era Context, Gmail, Calendar
- **File System:** Full read/write to rewrite-mcp directory
- **Bash:** Via tool; prefer PowerShell for Windows compatibility
- **npm:** Full support for monorepo scripts

### Platform-Specific Notes
- **Windows Path Handling:** Use backslashes carefully; consider cross-platform paths
- **WSL2 Integration:** Some skills (environment-diagnostics) are WSL2-aware
- **MSIX App:** Claude Desktop config persistence; fallback to fallback config locations
- **Memory Persistence:** Skills can read/write to project memory directory

### Testing Checklist
- [ ] All 13 skills pass tests in Claude Code
- [ ] File I/O works cross-platform (Windows/WSL2)
- [ ] MCP servers initialize without errors
- [ ] npm scripts execute successfully

---

## Copilot (Secondary Platform)

### Status
⚠️ **9 of 13 skills supported** — Requires adaptation for 4 skills.

### Not Recommended (4 skills)
1. **treatment-update** — Requires .docx handling; Copilot has limited file I/O
2. **research-capture** — CIC documentary context too specific
3. **approvals-audit** — Claude Code-specific logging
4. **environment-diagnostics** — Windows-only; assumes specific tool availability

### Requires Adaptation (4 skills)
1. **web-regression** — Current: bash script → Adapt: PowerShell script
2. **doc-update** — Current: npm + MkDocs → Adapt: GitHub Pages or alternative
3. **docs-sync-release** — Current: npm scripts → Adapt: batch files or PowerShell
4. **cic-roadmap-updater** — Current: Git + npm → Adapt: Copilot's project context

### Platform Limitations
- **File Access:** Limited to workspace; no direct ~/.config/ access
- **Process Spawning:** Must use Copilot's process API; no arbitrary bash/PowerShell
- **npm Scripts:** Available if workspace includes package.json
- **Git Integration:** Via Copilot's git commands (limited scope)
- **External APIs:** Requires Copilot's auth flow (different from Claude)

### Recommended Adaptation Strategy

#### 1. Create Copilot-Specific Skill Wrapper
```typescript
// skills/cic-section-summarizer.copilot.ts
import { summarizeSection as claudeSkill } from './cic-section-summarizer/index.js';

export async function summarizeSection(params) {
  // Copilot-specific context extraction
  const context = await copilot.workspace.getFiles(params.files);
  
  // Delegate to shared logic
  return claudeSkill({ ...params, context });
}
```

#### 2. PowerShell Equivalents
For bash scripts like `web-regression`:

```powershell
# tools/regressions/check-links.ps1
param([string]$ScanPath = ".")

Get-ChildItem -Path $ScanPath -Filter "*.html", "*.md" -Recurse | ForEach-Object {
    # Check links in file
}
```

#### 3. Skip Platform-Specific Skills
Don't deploy `treatment-update`, `research-capture`, `approvals-audit`, or `environment-diagnostics` to Copilot.

### Testing Checklist
- [ ] 9 adapted skills pass tests in Copilot
- [ ] PowerShell scripts work on Windows
- [ ] File access respects workspace boundaries
- [ ] External API calls use Copilot auth

---

## Gemini (Tertiary Platform)

### Status
⚠️ **9 of 13 skills supported** — Requires significant adaptation.

### Not Recommended (4 skills)
Same as Copilot: `treatment-update`, `research-capture`, `approvals-audit`, `environment-diagnostics`.

### Requires Adaptation (4 skills)
1. **web-regression** — Current: bash → Adapt: JavaScript/Node.js
2. **doc-update** — Current: npm + MkDocs → Adapt: JavaScript + markdown
3. **docs-sync-release** — Current: npm scripts → Adapt: JavaScript + tar
4. **cic-roadmap-updater** — Current: Git → Adapt: API-based approach

### Platform Limitations
- **Process Spawning:** No shell access; JavaScript-only execution
- **File System:** Limited to project workspace
- **Git Integration:** No native git; must use APIs or fallback to filesystem
- **External APIs:** Requires Gemini's auth (different from Claude/Copilot)
- **npm/Node:** May not be available; assume minimal dependencies

### Recommended Adaptation Strategy

#### 1. Create Gemini-Specific Skill
```javascript
// skills/cic-section-summarizer.gemini.js
export async function summarizeSection(params) {
  // Gemini doesn't have MCP servers; use REST APIs or files
  const files = await gemini.getFileContent(params.files);
  
  // Pure JavaScript logic (no subprocess calls)
  return analyzeSection(files, params.sectionId);
}

function analyzeSection(files, sectionId) {
  // Deterministic logic, no external calls
}
```

#### 2. Avoid Shell Dependencies
Replace bash/npm with JavaScript:

```javascript
// Instead of: bash tools/regressions/check-links.sh
// Use: Gemini-native link validation

async function checkLinks(directory) {
  const files = await gemini.getFilesRecursive(directory);
  return validateLinksInFiles(files);
}
```

#### 3. Async/Await Everywhere
Gemini's async model requires all operations to be async-first:

```javascript
// ✅ Good
export async function summarizeSection(params) {
  const data = await readData(params);
  return analyzeData(data);
}

// ❌ Bad (synchronous file access won't work)
export function summarizeSection(params) {
  const data = fs.readFileSync(params.file);
  return analyzeData(data);
}
```

### Testing Checklist
- [ ] 9 adapted skills pass tests in Gemini environment
- [ ] No shell/subprocess calls
- [ ] All file I/O is async
- [ ] External API calls use Gemini auth

---

## Cross-Platform Implementation Pattern

For skills that must work across all three platforms, follow this pattern:

```
skills/
  [skill-name]/
    index.js                          (shared logic)
    schema.json                       (API contract)
    [skill-name].claude.js            (Claude wrapper — minimal)
    [skill-name].copilot.ts           (Copilot wrapper — adapted)
    [skill-name].gemini.js            (Gemini wrapper — JavaScript)
    index.test.js                     (platform-agnostic tests)
    [skill-name].copilot.test.ts      (Copilot-specific tests)
    [skill-name].gemini.test.js       (Gemini-specific tests)
```

**Key principle:** Shared logic in `index.js`, platform wrappers handle I/O, auth, and subprocess calls.

---

## Auth & Credentials

### Claude
- **Storage:** `~/.claude/projects/*/auth/`
- **Format:** JSON files or environment variables
- **Pattern:** Read from env first, fall back to file

### Copilot
- **Storage:** Copilot's credential store (encrypted)
- **Format:** Via `copilot.secrets` API
- **Pattern:** Request via Copilot API; cached by Copilot

### Gemini
- **Storage:** Google Cloud credentials (Service Account)
- **Format:** Service account JSON key
- **Pattern:** Environment variable `GOOGLE_APPLICATION_CREDENTIALS`

**Recommendation:** Abstract auth in a shared utility:

```javascript
// shared/auth.js
export async function getApiKey(service) {
  if (isClaudeCode()) return process.env[`${service}_KEY`];
  if (isCopilot()) return copilot.secrets.get(`${service}_key`);
  if (isGemini()) return process.env[`${service}_KEY`];
}
```

---

## Dependency Management

| Dependency | Claude | Copilot | Gemini |
|------------|--------|---------|--------|
| **npm packages** | ✅ Full | ⚠️ Limited | ⚠️ Limited |
| **Bash/Shell** | ✅ Yes | ⏸️ PowerShell only | ❌ No |
| **Node.js modules** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Native binaries** | ✅ Yes | ❌ No | ❌ No |
| **WASM** | ✅ Yes | ⚠️ Untested | ⚠️ Untested |

**Recommendation:** Keep dependencies minimal; prefer JavaScript-only for cross-platform.

---

## Deployment Checklist

### Before releasing to each platform:

#### Claude
- [ ] All 13 skills pass tests
- [ ] File I/O works on Windows + WSL2
- [ ] MCP servers initialize
- [ ] Memory persistence verified

#### Copilot
- [ ] 9 skills adapted and tested
- [ ] PowerShell scripts work
- [ ] Workspace boundaries respected
- [ ] Copilot auth integrated

#### Gemini
- [ ] 9 skills adapted and tested
- [ ] Zero shell dependencies
- [ ] All I/O is async
- [ ] Gemini auth integrated

---

## FAQ

**Q: Can I deploy all 13 skills to all three platforms?**  
A: No. 4 skills are Claude-specific (`treatment-update`, `research-capture`, `approvals-audit`, `environment-diagnostics`). Deploy the recommended 9 to Copilot and Gemini.

**Q: How do I handle secrets?**  
A: Use platform-specific credential stores. See "Auth & Credentials" section above.

**Q: What if a skill needs external APIs?**  
A: Abstract API calls behind platform-specific wrappers. Use `getApiKey()` pattern.

**Q: Can I use bash in Copilot?**  
A: Only PowerShell on Windows. Provide `.ps1` equivalents for bash scripts.

**Q: How do I test cross-platform?**  
A: Run tests in each environment: Claude Code, Copilot VS Code plugin, Gemini web interface.

---

## Next Steps

1. **Implement wrappers** — Create platform-specific skill wrappers (3–4 weeks)
2. **Test cross-platform** — Validate in all three environments (2 weeks)
3. **Update documentation** — Create platform-specific guides (1 week)
4. **Roll out incrementally** — Start with Copilot, then Gemini (2 weeks)

---

## References

- [API Reference](./SKILLS_API_REFERENCE.md)
- [Library Overview](./SKILLS_LIBRARY.md)
- [Implementation Scaffolds](./skills/)
