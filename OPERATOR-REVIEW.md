# Review: operator.yml Workflow Fix

Reviewed: 2026-06-11T00:00:00Z
Reviewer: ijfw-review
Domain: software

## Summary

Operator.yml now correctly calls `npm run doc:drift` instead of the broken `npm run doc:version`. The doc:drift script properly references an existing implementation file (`tools/doc-drift-check.js`), resolving the workflow CI failure. However, the orphaned `doc:version` npm script in package.json still references a missing implementation file and should be addressed upstream.

## BLOCK findings

(none)

## FLAG findings

- `package.json:39`: `doc:version` npm script references non-existent `scripts/docVersion.js`. Script was never implemented but is declared in package.json. Remove the script declaration or implement the missing file to prevent future confusion.

## NIT findings

(none)

## Verification

- [x] Local test: `npm run doc:drift` passes with exit code 0
- [x] Local test: `npm run test:rewrite-labs` passes (skips only due to missing API key, expected in local env)
- [x] Workflow syntax valid (YAML parses)
- [x] Commit follows CLAUDE.md conventions (uses [claude] prefix)
- [x] Pre-commit hooks passed (BOB, policy validation)
- [x] Pushed to origin/main (commit b76aeaa)

## Related commits

- `488ff25` — initial fix (used doc:version, incorrect)
- `b76aeaa` — corrected fix (uses doc:drift, correct)

