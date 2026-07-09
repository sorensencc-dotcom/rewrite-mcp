# Roadmap Validator — Integration Diagram

Visual representation of how the Roadmap Validator integrates with the Toolforge ecosystem.

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        TOOLFORGE PLATFORM                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Toolforge Universal Runner                  │   │
│  │                  (run-tool.ps1)                          │   │
│  └────────────────────┬─────────────────────────────────────┘   │
│                       │                                            │
│                       │ invokes                                    │
│                       ▼                                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         Roadmap Validator Skill                          │   │
│  │        (roadmap-validator v1.0.0)                        │   │
│  │                                                          │   │
│  │  Inputs:  roadmapPath, verbose, strict                  │   │
│  │  Outputs: isValid, findings, syncMarkersPresent         │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────┐    │   │
│  │  │  Validation Checks:                            │    │   │
│  │  │  ✓ Sync marker detection                       │    │   │
│  │  │  ✓ Markdown structure                          │    │   │
│  │  │  ✓ Content integrity                           │    │   │
│  │  │  ✓ File accessibility                          │    │   │
│  │  └────────────────────────────────────────────────┘    │   │
│  └────────────────────┬────────────────────────────────────┘   │
│                       │                                            │
│                       │ reads                                      │
│                       ▼                                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Repository ROADMAPs                         │   │
│  │                                                          │   │
│  │  C:\dev\cic\ROADMAP.md                                 │   │
│  │  C:\dev\cic-os\ROADMAP.md                              │   │
│  │  C:\dev\rewrite-mcp\ROADMAP.md                         │   │
│  │  C:\dev\cic-ingestion\ROADMAP.md                       │   │
│  │  C:\dev\charlie-deep-research\ROADMAP.md               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

           │
           │ findings / validation results
           ▼

    ┌──────────────────────────┐
    │   CI/CD Pipelines        │
    │   (GitHub Actions, etc)  │
    │                          │
    │   Validate before:       │
    │   • Merge PRs            │
    │   • Deploy               │
    │   • Sync repos           │
    └──────────────────────────┘
```

---

## Workflow Integration

### 1. Manual Validation

```
Developer
    │
    ├─► Run Validator
    │      ./run-tool.ps1 -Run roadmap-validator
    │
    ├─► Check Findings
    │      if (isValid) { proceed }
    │      else { fix & retry }
    │
    └─► Commit/Push
         (valid roadmap)
```

### 2. Continuous Integration

```
Git Commit
    │
    ├─► GitHub Actions Workflow
    │      runs: roadmap-validator
    │
    ├─► Check Strict Mode
    │      strict: true (fail on warnings)
    │
    ├─► Decision
    │      if (valid) { allow merge }
    │      else { block PR }
    │
    └─► Status Check
         visible on PR
```

### 3. Automated Sync

```
multiRepoRoadmapSync Daemon
    │
    ├─► Generate Changes
    │      (insert/update canonical content)
    │
    ├─► Validate Each Repo
    │      validator.validate(repo/ROADMAP.md)
    │
    ├─► Verify Results
    │      all findings < error level
    │
    └─► Auto-Commit
         (if all valid)
```

---

## Data Flow

### Input Processing

```
User Input
├─ roadmapPath (required)
│  └─ normalize & validate path
├─ verbose (optional)
│  └─ enable console logging
└─ strict (optional)
   └─ fail on warnings

         ▼

  Handler Function
  handler(RoadmapValidatorInput)
```

### Validation Pipeline

```
Read File
    │
    ├─► Check Existence
    │      File exists? → FILE_NOT_FOUND
    │
    ├─► Read Content
    │      Read errors? → FILE_READ_ERROR
    │
    ├─► Parse Markers
    │      <!-- SYNC:TOOLFORGE --> found? → MISSING_OPEN_MARKER
    │      <!-- END:SYNC --> found? → MISSING_CLOSE_MARKER
    │
    ├─► Validate Order
    │      Close before open? → MARKER_ORDER
    │
    ├─► Check Content
    │      Empty between markers? → EMPTY_SYNC_BLOCK
    │
    ├─► Structure Check
    │      Headers present? → NO_HEADERS (warning)
    │
    └─► Size Check
         > 100 KB? → LARGE_FILE (warning)

         ▼

  Collect Findings
  (errors, warnings, info)
```

### Output Generation

```
Findings Array
    │
    ├─► Filter by Level
    │   ├─ Errors: blocks isValid
    │   ├─ Warnings: blocks if strict=true
    │   └─ Info: never blocks
    │
    ├─► Build Message
    │   └─ "Roadmap validation complete: N findings"
    │
    └─► Return Structure
        {
          status: "success"|"error",
          message: string,
          data: { isValid, findings, ... },
          code?: string
        }
```

---

## Integration Points

### Toolforge Ecosystem

```
┌─────────────────────────────────────┐
│       Toolforge Manifest            │
│  (manifest.json)                    │
│                                     │
│  {                                  │
│    "name": "roadmap-validator",     │
│    "category": "skills",            │
│    "path": "skills/roadmap-validator"
│  }                                  │
└──────────────┬──────────────────────┘
               │
               ├─► run-tool.ps1 discovers skill
               │
               ├─► Skill Runner executes handler
               │
               └─► Results reported to caller
```

### Distributed Sync

```
Local Instance (C:\dev)
│
├─ skill.json: distributed.syncable = true
├─ distributed.distributedPath = "rewrite-mcp/toolforge/skills/roadmap-validator"
│
└─► toolforgeSkillSync.ps1 distributes to:
    └─ rewrite-mcp/toolforge/skills/roadmap-validator/
```

### CIC Integration (Future)

```
CIC Governance (not currently integrated)
│
├─ Potential: Gate changes through CIC approval
├─ Potential: Log validation results to CIC
├─ Potential: Trigger remediation workflows
│
└─ Status: Adapter not implemented yet
```

---

## Permission Requirements

```
┌─────────────────────────────────────┐
│    Skill Permission Model           │
├─────────────────────────────────────┤
│                                     │
│  Required:                          │
│  └─ read:repo                       │
│     (read ROADMAP.md files)         │
│                                     │
│  Restricted:                        │
│  └─ delete:permanent                │
│     (never allowed)                 │
│                                     │
└─────────────────────────────────────┘

  ▼ Checked by

┌─────────────────────────────────────┐
│     Permission Guard                │
│  (checked before execution)         │
├─────────────────────────────────────┤
│                                     │
│  If missing: PERMISSION_DENIED      │
│  If restricted: PERMISSION_DENIED   │
│                                     │
└─────────────────────────────────────┘
```

---

## Error Handling Chain

```
User Input
    │
    ├─ Invalid? → INVALID_INPUT (fail immediately)
    │
    ├─ File missing? → FILE_NOT_FOUND (in findings)
    │
    ├─ Read fails? → FILE_READ_ERROR (in findings)
    │
    ├─ Permission denied? → PERMISSION_DENIED (handler level)
    │
    ├─ Timeout? → TIMEOUT (skill runtime)
    │
    └─ Unexpected? → SKILL_ERROR (catch-all)

         ▼

    Return structured response with code + message
```

---

## Testing Integration

```
Test Suite (40+ tests)
│
├─ Setup Test Files
│  └─ Create temporary ROADMAP.md fixtures
│
├─ Run Validation Tests
│  ├─ Happy path (valid roadmaps)
│  ├─ Error cases (missing markers)
│  ├─ Edge cases (unicode, large files)
│  └─ Output format validation
│
├─ Cleanup
│  └─ Remove temporary test files
│
└─ Report Results
   ├─ Test summary
   ├─ Code coverage
   └─ Pass/fail status
```

---

## Typical Usage Flows

### Flow 1: PR Validation (GitHub Actions)

```yaml
name: Validate Roadmap
on: [pull_request]
jobs:
  validate:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v2
      - name: Validate ROADMAP.md
        run: |
          ./run-tool.ps1 -Run roadmap-validator `
            -Input '{
              "roadmapPath": "ROADMAP.md",
              "strict": true
            }'
```

### Flow 2: Batch Multi-Repo Validation

```typescript
const repos = [
  "C:\\dev\\cic\\ROADMAP.md",
  "C:\\dev\\cic-os\\ROADMAP.md"
];

for (const roadmapPath of repos) {
  const result = await validator({ roadmapPath, strict: true });
  
  if (!result.data?.isValid) {
    console.error(`Invalid: ${roadmapPath}`);
    process.exit(1);
  }
}
```

### Flow 3: Developer Workflow

```bash
# After editing ROADMAP.md
./run-tool.ps1 -Run roadmap-validator -Input '{
  "roadmapPath": "C:\dev\myrepo\ROADMAP.md",
  "verbose": true
}'

# Check findings, fix if needed
# Commit when valid
```

---

## Performance Characteristics

```
Operation           Typical Time    Max Time    Factors
──────────────────────────────────────────────────────────
Read File           < 10ms          < 100ms     File size
Parse Markers       < 5ms           < 50ms      Content size
Validate Structure  < 10ms          < 100ms     File complexity
Return Results      < 5ms           < 50ms      Findings count
──────────────────────────────────────────────────────────
Total (happy path)  ~30ms           ~300ms      File size
```

**Configured Timeout**: 30 seconds (more than sufficient)

---

## Scaling Considerations

```
Single File Validation
└─ ~30ms per file
└─ Can validate 2000 files in ~60 seconds

Batch Validation (5 repos)
└─ ~150ms total
└─ Good for CI/CD gate

Concurrent Validation (with parallel skill runner)
└─ 5 repos × 30ms in parallel = ~30ms
└─ Suitable for large multi-repo sync
```

---

## Dependency Graph

```
roadmap-validator
│
├─ Internal Dependencies
│  └─ (none)
│
├─ External Dependencies
│  └─ Node.js built-ins
│     ├─ fs (file system)
│     └─ path (path utilities)
│
└─ Runtime Dependencies
   └─ Toolforge Framework
      ├─ Skill registry
      ├─ Permission guard
      └─ Execution timeout
```

---

## Future Integration Points

```
Potential Integrations (v2.0+)

├─ CIC Governance
│  └─ Gate approvals for roadmap changes
│
├─ Dashboard
│  └─ Real-time validation status
│
├─ Slack/Email
│  └─ Validation alerts
│
├─ Git Hooks
│  └─ Pre-commit validation
│
└─ Metrics Collection
   └─ Track validation trends
```

---
