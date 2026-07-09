# Roadmap Validator

Validates Toolforge ROADMAP.md files for sync markers, format, and content integrity.

**Status**: Production-ready  
**Version**: 1.0.0  
**Runtime**: TypeScript  
**Category**: Validation

---

## What is This?

A Toolforge skill that validates ROADMAP.md files across the Toolforge ecosystem, ensuring:
- ✅ Proper sync marker presence (`<!-- SYNC:TOOLFORGE -->` / `<!-- END:SYNC -->`)
- ✅ Valid markdown structure
- ✅ Content integrity and accessibility
- ✅ Support for both permissive and strict validation

---

## Structure

```
roadmap-validator/
├── skill.json              # Metadata (REQUIRED)
├── README.md               # This file
├── src/
│   └── index.ts            # Implementation (TypeScript)
├── tests/
│   └── skill.test.ts       # Test suite (40+ tests)
└── docs/
    └── USAGE.md            # Full documentation
```

---

## Getting Started

### Basic Usage

```typescript
import handler from "./src/index.ts";

const result = await handler({
  roadmapPath: "C:\\dev\\cic\\ROADMAP.md"
});

if (result.data?.isValid) {
  console.log("✓ Roadmap is valid");
} else {
  console.log("✗ Roadmap has issues:");
  result.data?.findings.forEach(f => console.log(`  - ${f.message}`));
}
```

### Via Toolforge

```bash
./run-tool.ps1 -Run roadmap-validator -Input '{"roadmapPath":"C:\\dev\\cic\\ROADMAP.md"}'
```

---

## Features

### Validation Checks

| Check | Type | Description |
|-------|------|-------------|
| **Sync Markers** | Required | Both opening & closing markers present and ordered correctly |
| **Content** | Required | Non-empty content between markers |
| **Structure** | Warning | Markdown headers (H1/H2) present |
| **File Size** | Warning | Warns if file > 100 KB |

### Modes

- **Permissive** (default): Pass with warnings
- **Strict**: Fail on any warnings (useful for CI/CD)

### Output

Detailed findings with:
- Error/warning/info levels
- Specific error codes
- Human-readable messages
- File metadata (size, timestamp)

---

## Key Parameters

### Required
- **roadmapPath** (string) — Path to ROADMAP.md

### Optional
- **verbose** (boolean) — Enable detailed logging (default: false)
- **strict** (boolean) — Fail on warnings (default: false)

---

## Return Value

### Success Response
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

### Error Response
```json
{
  "status": "error",
  "message": "Input validation failed: roadmapPath is required",
  "code": "INVALID_INPUT"
}
```

---

## Common Error Codes

| Code | Level | Fix |
|------|-------|-----|
| `MISSING_OPEN_MARKER` | Warning | Add `<!-- SYNC:TOOLFORGE -->` |
| `MISSING_CLOSE_MARKER` | Warning | Add `<!-- END:SYNC -->` |
| `EMPTY_SYNC_BLOCK` | Error | Add canonical content |
| `MARKER_ORDER` | Error | Reorder markers (open before close) |
| `FILE_NOT_FOUND` | Error | Verify file path exists |

See [docs/USAGE.md](docs/USAGE.md) for complete error reference.

---

## Testing

Run the test suite:

```bash
npm test
```

Coverage: 40+ tests including:
- Happy path (valid roadmaps)
- Error cases (missing files, bad markers)
- Edge cases (unicode, large files)
- Strict mode behavior
- Output format validation

---

## Integration

### Toolforge
- Registered: False (set in skill.json)
- Sync path: `rewrite-mcp/toolforge/skills/roadmap-validator`
- Manifest: Add to `manifest.json` when registering

### CIC Integration
- Not integrated (flag in skill.json)
- Adapter: Not needed
- Registry: Not needed

---

## Metadata

**ID**: roadmap-validator  
**Version**: 1.0.0  
**Timeout**: 30 seconds  
**Max Retries**: 3  
**Retry Policy**: Exponential backoff  

**Permissions**:
- Required: `read:repo`
- Restricted: `delete:permanent`

---

## Before Submitting

Checklist:
- [x] skill.json is valid JSON
- [x] All required metadata fields present
- [x] src/index.ts compiles and exports default
- [x] tests/ directory has test suite
- [x] Tests pass: `npm test`
- [x] docs/USAGE.md is complete
- [x] README.md updated with skill details
- [x] Error handling covers all error conditions
- [x] Proper TypeScript types defined
- [x] 40+ comprehensive tests

---

## Documentation

- **[docs/USAGE.md](docs/USAGE.md)** — Complete usage guide with examples
- **[skill.json](skill.json)** — Skill metadata and configuration
- **[tests/skill.test.ts](tests/skill.test.ts)** — Test suite (40+ tests)
- **[src/index.ts](src/index.ts)** — Implementation with JSDoc

---

## Related Skills

- `multiRepoRoadmapSync` — Syncs canonical roadmap across repos
- `roadmap-generator` — Generates new ROADMAP.md from templates

---

## License

MIT

---

## Author

Toolforge Team (2026-06-28)

---
