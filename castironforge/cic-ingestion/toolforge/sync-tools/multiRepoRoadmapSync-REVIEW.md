# Review: multiRepoRoadmapSync.ts

Reviewed: 2026-06-28T04:45:00Z
Reviewer: ijfw-review
Domain: software

## Summary

Drift detection and doc update logic is sound, but file handling has memory/parsing gaps, webhook validation is weak, and hardcoded thresholds reduce portability. Most issues are operational (missing size guards, unvalidated JSON, fragile markdown parsing) rather than logic bugs. Fixable in <30 min.

## BLOCK findings (must-fix)

- Line 183: Regex DoS risk in footer replacement. `[\s\S]*$` can backtrack catastrophically on large files. Use `[\s\S]+?` (lazy) or `[^]*?` to bound.
- Line 76, 126: Unbounded file reads. `fs.readFileSync()` with no size limit; huge STATUS.md or roadmap docs OOM daemon. Add max-size check (e.g., reject >50MB).
- Line 315: Unvalidated JSON.parse(). Malformed registry crashes entire daemon with cryptic error. Wrap in try-catch and emit user-friendly error message.
- Line 157-170: Array bounds unchecked. Split by `|` yields variable columns; loop assumes parts[k] exists. Malformed markdown table causes undefined cell access. Add bounds check: `if (k < parts.length)`.

## FLAG findings (should-discuss)

- Line 138-149: Naive table detection. Searching for "Status" text matches non-table rows (e.g., "The current Status is..."). Should parse markdown table grammar rigorously (header separator `---`, aligned pipes, repo name in same row).
- Line 86-87: Hardcoded 14-day stall threshold. Repos with slower update cadence (e.g., frozen phase, scheduled release) wrongly marked "stalled". Extract to `DRIFT_STALL_HOURS` config, settable per-repo in registry.
- Line 308: Registry path relative to cwd. Scheduled Task runs from fixed dir (C:\dev), but if cwd changes, registry lookup fails silently. Use absolute path or validate cwd at startup.
- Line 264-265: Slack POST failures not retried. If Slack is temporarily down, notification silently lost; operator unaware. Log to JSON report and optionally retry exponential backoff (3x with 5s delay).
- Line 122, 203: Uses console.warn for file errors. Should use console.error; warns are non-fatal, but missing roadmap doc is operational error worth alerting.

## NIT findings (polish)

- Line 14: Typo in interface. `mastRoadmap` should be `masterRoadmap`.
- Line 16: Unused field. `archiveDir` defined in Registry interface but never referenced in code. Remove or implement backup logic.
- Lines 42, 52, 86-87: Extract magic numbers to named constants: `const ACTIVE_HOURS = 24; const STALL_HOURS = 14 * 24;` at top of file. Improves readability and centralizes tuning.
- Line 153: Assumption unstated. Comment says "typically | Phase | Name | Status |" but no validation. Add assertion: `if (parts.length < 3) continue;` before loop.
- Line 315: No validation of registry.repos being array. If malformed (string, null, undefined), `.map()` or `.length` crashes. Add `if (!Array.isArray(registry.repos)) { throw new Error(...) }`.
