# Roadmap Validator — Usage Guide

Validates Toolforge ROADMAP.md files for sync markers, format, and content integrity.

**Version**: 1.0.0  
**Runtime**: TypeScript  
**Status**: Production-ready

---

## Overview

The Roadmap Validator ensures all ROADMAP.md files in the Toolforge ecosystem maintain proper structure and sync compliance.

### Purpose

- Verify presence of `<!-- SYNC:TOOLFORGE -->` / `<!-- END:SYNC -->` markers
- Validate markdown structure (headers, content)
- Check file accessibility and integrity
- Support both permissive and strict validation modes
- Generate detailed findings for automated or manual review

### Quick Example

```typescript
const result = await handler({
  roadmapPath: "C:\\dev\\cic\\ROADMAP.md",
  verbose: true,
  strict: false
});

// Result:
// {
//   status: "success",
//   message: "Roadmap validation complete: 0 findings",
//   data: {
//     isValid: true,
//     findings: [],
//     syncMarkersPresent: true,
//     contentLength: 2048,
//     validated: "2026-06-28T12:00:00.000Z"
//   }
// }
```

---

## Inputs

### Required

#### `roadmapPath` (string)

**Description**: File path to ROADMAP.md to validate.

**Constraints**:
- Type: string
- Must be non-empty
- Must point to a readable file
- Absolute or relative paths supported

**Example**:
```json
{
  "roadmapPath": "C:\\dev\\cic\\ROADMAP.md"
}
```

### Optional

#### `verbose` (boolean)

**Description**: Enable detailed validation reporting with console logs.

**Default**: `false`

**Constraints**:
- Type: boolean
- Values: true or false

**Example**:
```json
{
  "roadmapPath": "C:\\dev\\cic\\ROADMAP.md",
  "verbose": true
}
```

#### `strict` (boolean)

**Description**: Enforce strict validation. Fails on warnings in addition to errors.

**Default**: `false`

**Constraints**:
- Type: boolean
- If true, any warning-level finding causes validation failure
- If false, only errors cause failure

**Example**:
```json
{
  "roadmapPath": "C:\\dev\\cic\\ROADMAP.md",
  "strict": true
}
```

---

## Outputs

### Success Output

Returned when validation completes (even with findings).

```json
{
  "status": "success",
  "message": "Roadmap validation complete: 0 findings",
  "data": {
    "isValid": true,
    "findings": [],
    "syncMarkersPresent": true,
    "contentLength": 2048,
    "validated": "2026-06-28T12:00:00.000Z"
  }
}
```

**Fields**:
- `status` (string): Always "success" for validation completion
- `message` (string): Summary of validation results
- `data` (object):
  - `isValid` (boolean): True if no error-level findings
  - `findings` (array): List of validation findings
  - `syncMarkersPresent` (boolean): True if both markers present
  - `contentLength` (number): File size in bytes
  - `validated` (string): ISO 8601 timestamp of validation

### Findings Array

Each finding object has:
```json
{
  "level": "error|warning|info",
  "code": "ERROR_CODE",
  "message": "Human-readable description",
  "line": 42
}
```

**Levels**:
- `error`: Prevents valid status, always fails
- `warning`: Only fails in strict mode
- `info`: Informational only, never fails

---

## Error Codes

### Validation Findings (In Results)

| Code | Level | Trigger | Action |
|------|-------|---------|--------|
| `FILE_NOT_FOUND` | Error | File doesn't exist | Check path exists |
| `FILE_READ_ERROR` | Error | Cannot read file | Check permissions |
| `MARKER_ORDER` | Error | Close marker before open | Reorder markers |
| `EMPTY_SYNC_BLOCK` | Error | No content between markers | Add canonical content |
| `MISSING_OPEN_MARKER` | Warning | No opening marker | Add `<!-- SYNC:TOOLFORGE -->` |
| `MISSING_CLOSE_MARKER` | Warning | No closing marker | Add `<!-- END:SYNC -->` |
| `NO_HEADERS` | Warning | No markdown headers | Add H1/H2 headers |
| `LARGE_FILE` | Warning | File > 100 KB | Consider splitting |

### Handler Errors (Status = "error")

| Code | Trigger | Solution |
|------|---------|----------|
| `INVALID_INPUT` | Missing/invalid roadmapPath | Provide valid file path |
| `FILE_NOT_FOUND` | File doesn't exist | Verify path in input |
| `SKILL_ERROR` | Unexpected execution error | Check logs |
| `PERMISSION_DENIED` | Insufficient permissions | Grant read:repo permission |

---

## Permissions

The skill requires:

### Required
- `read:repo` — Read ROADMAP.md files

### Optional
- None

### Restricted
- `delete:permanent` — Not permitted

---

## Dependencies

### Internal
- None

### External
- Node.js built-ins (`fs`, `path`)

---

## Usage Examples

### Basic Validation

```typescript
import handler from "./src/index.ts";

const result = await handler({
  roadmapPath: "C:\\dev\\cic\\ROADMAP.md"
});

console.log(result);
```

### With Verbose Output

```typescript
const result = await handler({
  roadmapPath: "C:\\dev\\cic\\ROADMAP.md",
  verbose: true
});

// Logs: [VALIDATOR] Validating: C:\dev\cic\ROADMAP.md
// Logs: [VALIDATOR] Validation complete: 0 findings
```

### Strict Mode (CI/CD)

```typescript
const result = await handler({
  roadmapPath: "C:\\dev\\cic\\ROADMAP.md",
  strict: true  // Fail on any warnings
});

if (result.status === "error") {
  throw new Error(result.message);
}
```

### Batch Validation

```typescript
const repos = [
  "C:\\dev\\cic\\ROADMAP.md",
  "C:\\dev\\cic-os\\ROADMAP.md",
  "C:\\dev\\rewrite-mcp\\ROADMAP.md"
];

for (const roadmapPath of repos) {
  const result = await handler({ roadmapPath });
  console.log(`${roadmapPath}: ${result.data?.isValid ? "✓" : "✗"}`);
}
```

### Integration with Toolforge

```bash
# Validate a roadmap
./run-tool.ps1 -Run roadmap-validator -Input '{"roadmapPath":"C:\\dev\\cic\\ROADMAP.md"}'

# Verbose mode
./run-tool.ps1 -Run roadmap-validator -Input '{"roadmapPath":"C:\\dev\\cic\\ROADMAP.md","verbose":true}'

# Strict mode (for CI)
./run-tool.ps1 -Run roadmap-validator -Input '{"roadmapPath":"C:\\dev\\cic\\ROADMAP.md","strict":true}'
```

---

## Sync Marker Requirements

### Format

**Opening Marker:**
```html
<!-- SYNC:TOOLFORGE -->
```

**Closing Marker:**
```html
<!-- END:SYNC -->
```

### Valid Structure

```markdown
# Project Roadmap

<!-- SYNC:TOOLFORGE -->
## Phase 1 — Foundation
Core infrastructure setup.

## Phase 2 — Operationalization
Tooling and documentation.
<!-- END:SYNC -->

## Project-Specific Additions

Custom content for this repo only.
```

### Preservation of Repo-Specific Content

- Content **before** opening marker is preserved
- Content **after** closing marker is preserved
- Content **between** markers is sync'd from canonical

---

## Error Handling Examples

### Missing Markers

**Input**:
```json
{
  "roadmapPath": "C:\\dev\\custom-repo\\ROADMAP.md"
}
```

**Output**:
```json
{
  "status": "success",
  "message": "Roadmap validation complete: 2 findings",
  "data": {
    "isValid": true,
    "findings": [
      {
        "level": "warning",
        "code": "MISSING_OPEN_MARKER",
        "message": "Missing opening sync marker: <!-- SYNC:TOOLFORGE -->"
      },
      {
        "level": "warning",
        "code": "MISSING_CLOSE_MARKER",
        "message": "Missing closing sync marker: <!-- END:SYNC -->"
      }
    ]
  }
}
```

### File Not Found

**Input**:
```json
{
  "roadmapPath": "/nonexistent/ROADMAP.md"
}
```

**Output**:
```json
{
  "status": "success",
  "message": "Roadmap validation complete: 1 findings",
  "data": {
    "isValid": false,
    "findings": [
      {
        "level": "error",
        "code": "FILE_NOT_FOUND",
        "message": "File does not exist: /nonexistent/ROADMAP.md"
      }
    ]
  }
}
```

### Strict Mode Failure

**Input**:
```json
{
  "roadmapPath": "C:\\dev\\cic\\ROADMAP.md",
  "strict": true
}
```

**Output** (with warnings):
```json
{
  "status": "error",
  "message": "Roadmap validation failed (strict mode): 1 issues found",
  "code": "VALIDATION_FAILED"
}
```

---

## Related Skills

- `multiRepoRoadmapSync` — Syncs canonical roadmap across all repos
- `roadmap-generator` — Generates new roadmaps from templates

---

## Troubleshooting

### Invalid Input Error

**Problem**: `INVALID_INPUT` error

**Solution**: Ensure `roadmapPath`:
- Is provided and non-empty
- Is a valid string (not null/undefined)
- Contains the file path (absolute recommended)

**Example**:
```typescript
// ✓ Correct
{ roadmapPath: "C:\\dev\\cic\\ROADMAP.md" }

// ✗ Wrong
{ roadmapPath: "" }                    // empty
{ roadmapPath: null }                  // null
{ }                                    // missing
```

### File Not Found

**Problem**: `FILE_NOT_FOUND` error

**Solution**:
- Verify path exists: `Test-Path "C:\dev\cic\ROADMAP.md"`
- Check for typos in path
- Use absolute paths for reliability
- Ensure file is not locked

### Permission Denied

**Problem**: Skill lacks read permissions

**Solution**:
- Grant `read:repo` permission
- Check file/folder permissions
- Run with appropriate user context

### Sync Markers Missing

**Problem**: Warnings about missing markers

**Solution**:
- Add opening: `<!-- SYNC:TOOLFORGE -->`
- Add closing: `<!-- END:SYNC -->`
- Use provided content between markers
- See "Sync Marker Requirements" section

---

## Testing

Run the test suite:

```bash
npm test
```

Test coverage includes:
- Valid roadmaps with proper markers
- Missing marker detection
- Marker ordering validation
- File accessibility errors
- Strict mode behavior
- Output format validation
- Edge cases (unicode, large files, special chars)

---

## Support

For issues or questions:

1. Check findings array for specific error codes
2. Review [skill.json](../skill.json) metadata
3. Check test suite in [tests/](../tests/)
4. See [../../GOVERNANCE.md](../../GOVERNANCE.md) for standards

---

## Version History

### 1.0.0 (2026-06-28)
- Initial release
- Full sync marker validation
- Strict mode support
- Comprehensive error handling
- 40+ test cases

---
