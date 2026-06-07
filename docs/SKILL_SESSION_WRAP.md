# Session Wrap Skill (Phase 47.1)

Automate session wrap-up tasks: update documentation, commit changes, provide summary and next steps.

## Overview

**Tool Name:** `session_wrap`  
**Skill Name:** `session-wrap`  
**Status:** Ready for deployment  
**Platforms:** Claude  

## Purpose

Wrap up work sessions by automating four tasks:
1. **Update Documentation** — Write changes to doc files
2. **Stage Changes** — Detect and stage modified files via git
3. **Commit Changes** — Create atomic commit with proper attribution
4. **Generate Report** — Summarize work and provide next steps

## Usage

### Basic Example

```javascript
// Via skill runtime
const result = await runtime.invokeSkill('session-wrap', {
  commitMessage: '[claude] Phase 47.1: Session wrap automation',
  summary: 'Completed approval audit and created session-wrap skill',
  docUpdates: [
    {
      path: 'docs/SKILL_SESSION_WRAP.md',
      content: '# Documentation content...'
    }
  ]
});
```

### Via Claude Code (MCP Tool)

Ask Claude to use the `session_wrap` tool with your session details.

## Input Schema

```json
{
  "commitMessage": "[tool] Description",     // Required: [claude|copilot|gemini|human]
  "summary": "Session work summary",          // Optional: user-provided summary
  "docUpdates": [                            // Optional: docs to update
    {
      "path": "file/path.md",
      "content": "file content"
    }
  ]
}
```

**Commit Message Format:** Must start with `[tool]` prefix:
- `[claude]` — architectural decisions, prompts, LLM work
- `[copilot]` — code generation, test stubs, boilerplate
- `[gemini]` — research, seed data, doc generation
- `[human]` — manual edits, when in doubt

## Output

```json
{
  "success": true,
  "commitHash": "abc123d",
  "docUpdates": [
    {
      "path": "docs/file.md",
      "status": "updated",
      "timestamp": "2026-06-07T12:34:56.789Z"
    }
  ],
  "stagedFiles": {
    "files": ["docs/file.md", "CLAUDE.md"],
    "filesCount": 2,
    "message": "Staged 2 file(s)"
  },
  "report": {
    "timestamp": "2026-06-07T12:34:56.789Z",
    "sessionWrap": {
      "userSummary": "...",
      "documentation": { "updated": 1, "failed": 0 },
      "git": {
        "stagedFiles": [...],
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

## Example Workflow

### 1. Complete a task
Write code, update docs, fix bugs

### 2. Call session-wrap
```
/session_wrap 
  commitMessage: "[claude] Phase 47: Feature implementation"
  summary: "Implemented X, tested Y, documented Z"
  docUpdates: [
    {path: "docs/FEATURE.md", content: "..."},
    {path: "HANDOFF.md", content: "..."}
  ]
```

### 3. Verify output
- ✅ Docs updated
- ✅ Files staged
- ✅ Commit created
- ✅ Next steps listed

### 4. Continue
Push changes, update HANDOFF.md, run tests

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
  "error": "Failed to commit: <git error>"
}
```

### Doc Update Failure
```json
{
  "success": true,
  "docUpdates": [
    {
      "path": "docs/failed.md",
      "status": "failed",
      "error": "ENOENT: file not found"
    }
  ]
}
```

## Implementation Details

**Location:** `skills-runtime/session-wrap.js`  
**Dependencies:** git, Node.js fs module  
**Timeout:** 30s default (configurable)  

## Next Steps

1. Test with real session data
2. Add HANDOFF.md auto-update capability
3. Add branch push option
4. Add test runner integration
