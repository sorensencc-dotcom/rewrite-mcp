# Session Wrap Skill

Automate session wrap-up tasks: update documentation, stage and commit changes, provide summary and next steps.

## Purpose

The session-wrap skill orchestrates four critical session-end tasks in a single atomic operation:

1. **Documentation Updates** — Write changes to doc files before committing
2. **Git Staging** — Detect and stage all modified files automatically
3. **Atomic Commits** — Create proper commits with required [tool] attribution
4. **Report Generation** — Summarize work completed and provide next steps

## Inputs

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `commitMessage` | string | ✅ | Git commit message with [tool] prefix |
| `summary` | string | ❌ | Session summary for reporting |
| `docUpdates` | array | ❌ | Documentation files to update before commit |

### Commit Message Format

All commit messages **must** start with a tool prefix:

- `[claude]` — Architectural decisions, LLM-generated work, prompt engineering
- `[copilot]` — Code generation, test stubs, boilerplate
- `[gemini]` — Research synthesis, seed data, documentation generation
- `[human]` — Manual edits, editorial work, final reviews

Example: `[claude] Phase 47.1: Implemented session-wrap skill`

## Outputs

Returns an object with:

```json
{
  "success": true,
  "commitHash": "abc123d",
  "docUpdates": [
    {
      "path": "docs/file.md",
      "status": "updated",
      "timestamp": "2026-06-07T12:00:00.000Z"
    }
  ],
  "stagedFiles": ["docs/file.md", "CLAUDE.md"],
  "report": {
    "timestamp": "2026-06-07T12:00:00.000Z",
    "sessionWrap": {
      "userSummary": "Completed X, tested Y, documented Z",
      "documentation": { "updated": 1, "failed": 0 },
      "git": {
        "stagedFiles": ["..."],
        "committed": true,
        "commitHash": "abc123d",
        "commitMessage": "[claude] Phase 47.1: ..."
      }
    },
    "nextSteps": [
      "Verify commit abc123d on current branch",
      "Push changes to remote if desired",
      "Update HANDOFF.md for next session continuity",
      "Run tests to verify no regressions"
    ],
    "checklistItems": [
      {
        "task": "Documentation updated",
        "completed": true,
        "detail": "1 file(s) updated"
      },
      {
        "task": "Changes staged",
        "completed": true,
        "detail": "2 file(s) staged"
      },
      {
        "task": "Changes committed",
        "completed": true,
        "detail": "Commit: abc123d"
      }
    ]
  }
}
```

## Example Usage

```javascript
const result = await sessionWrap({
  commitMessage: '[claude] Phase 47.1: Session wrap automation',
  summary: 'Implemented approval audit, created session-wrap skill',
  docUpdates: [
    {
      path: 'docs/FEATURE.md',
      content: '# Feature Documentation\n\nDetails here...'
    },
    {
      path: 'HANDOFF.md',
      content: '# Session Handoff\n\nNext priorities...'
    }
  ]
});

console.log(`Commit: ${result.commitHash}`);
console.log(`Staged: ${result.stagedFiles.length} files`);
console.log(`Report:\n${JSON.stringify(result.report, null, 2)}`);
```

## Workflow

### 1. Complete Session Work
Write code, update docs, fix bugs — make all necessary changes.

### 2. Invoke session-wrap
```
/session-wrap
  commitMessage: "[claude] Phase 47: Feature implementation"
  summary: "Implemented X, tested Y, documented Z"
  docUpdates: [
    {path: "docs/FEATURE.md", content: "..."},
    {path: "HANDOFF.md", content: "..."}
  ]
```

### 3. Verify Output
- ✅ Docs updated with timestamps
- ✅ Files staged (git add -A)
- ✅ Commit created with hash
- ✅ Next steps listed

### 4. Continue
Push changes, update HANDOFF.md, run tests, continue next session

## Error Handling

### Invalid Commit Message
```json
{
  "success": false,
  "error": "Invalid commit message format. Use: [tool] Subject or [tool] Phase X: Subject"
}
```

### Git Failure
```json
{
  "success": false,
  "error": "Failed to commit: <git error message>"
}
```

### Partial Doc Failure
```json
{
  "success": true,
  "docUpdates": [
    {
      "path": "docs/good.md",
      "status": "updated"
    },
    {
      "path": "docs/missing.md",
      "status": "failed",
      "error": "ENOENT: file not found"
    }
  ]
}
```

## Implementation

**File:** `skills/session-wrap/index.js`  
**Dependencies:** Node.js fs (promises), child_process (execSync), path  
**Execution Model:** Async/await orchestration  
**Timeout:** 30s default  

## Next Steps

1. Test with real session workflows
2. Add automatic HANDOFF.md updates
3. Add optional branch push capability
4. Integrate with test runner for post-commit validation
