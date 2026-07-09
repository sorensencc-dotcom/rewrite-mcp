# Roadmap Validator

Validates Toolforge ROADMAP.md files for sync markers, format, and content integrity.

## Metadata

- **ID:** roadmap-validator
- **Version:** 1.0.0
- **Category:** validation
- **Runtime:** typescript
- **Entrypoint:** src/index.ts
- **Author:** Toolforge Team
- **License:** MIT

## Description

Toolforge Roadmap Validator scans ROADMAP.md files for:
- Sync marker presence and correctness
- Format compliance
- Content integrity validation
- Heading structure validation
- Link validity

## Inputs

### Required
- `roadmapPath` (string) — File path to ROADMAP.md to validate

### Optional
- `verbose` (boolean) — Enable detailed validation reporting (default: false)
- `strict` (boolean) — Enforce strict validation (fail on warnings) (default: false)

## Outputs

### Success
```json
{
  "status": "success",
  "message": "Validation passed",
  "data": {
    "isValid": true,
    "findings": [],
    "syncMarkersPresent": true,
    "contentLength": 12345,
    "validated": "2026-06-28T12:00:00Z"
  }
}
```

### Error
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_FAILED",
  "details": {}
}
```

## Dependencies

- **Internal:** None
- **External:** None

## Permissions

- **Required:** read:repo
- **Restricted:** delete:permanent

## Status

- Canonical: ✅
- Distributed: Planned
- Integration: Pending

## Tags

- roadmap
- validation
- sync-markers

## Keywords

- roadmap
- validator
- sync
- documentation
