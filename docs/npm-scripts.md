# NPM Scripts Registry

Centralized documentation of all available npm scripts in rewrite-mcp monorepo.

**Last updated:** 2026-07-05

---

## Scripts Used by Workflows

These scripts are called by CI/CD workflows. Changes must be coordinated with workflow files.

### Nightly Validate (nightly-validate.yml)
- `npm run doc:drift` — Check documentation drift
- `npm run test:rewrite-labs` — Run all tests (runner script)

### Operator (operator.yml)
- `npm run doc:drift` — Check documentation drift
- `npm run test:rewrite-labs` — Run all tests

### Nightly Benchmarks (nightly-bench.yml)
- `npm run bench:capture` — Capture live SMB sites
- `npm run bench:metadata` — Extract metadata
- `npm run bench:opus-sonnet` — Run Opus/Sonnet rewrite benchmarks
- `npm run bench:status` — Generate dashboard status
- `npm run test:metadata` — Run metadata extraction tests

---

## Documentation & Build Scripts

- `sync-docs` — Sync documentation
- `build-docs` — Build documentation (runs doc:drift → test:links)
- `test:links` — Validate documentation links
- `doc:version` — Generate version docs
- `doc:drift` — Check documentation drift

---

## Benchmarking Scripts

- `bench:capture` — Capture live SMB sites
- `bench:metadata` — Extract metadata from benchmarks
- `bench:opus-sonnet` — Run Opus/Sonnet rewrite benchmarks
- `bench:render` — Render benchmark results
- `bench:stc` — Screenshot-to-code benchmark harness
- `bench:status` — Generate dashboard status
- `bench:all` — Run all benchmarks (capture → metadata → opus-sonnet)

---

## Testing Scripts

- `test:rewrite` — Run rewrite tests
- `test:render` — Run render tests
- `test:metadata` — Run metadata extraction tests
- `test:stc` — Run screenshot-to-code tests
- `test:rewrite-labs` — Run all tests (master runner script)

---

## Governance & Policy Scripts

- `policy:check` — Check policy compliance
- `policy:report` — Generate policy report
- `policy:exceptions` — List policy exceptions
- `policy:audit` — Audit policy enforcement

---

## Release Scripts

- `release:full` — Full release pipeline (doc:drift → build-docs → release:*)
- `release:notes` — Generate release notes
- `release:diff` — Generate release diff
- `release:timeline` — Generate timeline
- `release:tag` — Create git tags
- `release:bundle` — Bundle artifacts

---

## GitHub Actions Scripts

- `gh-actions:upgrade` — Upgrade GitHub Actions
- `gh-actions:check` — Check GitHub Actions compliance
- `gh-actions:fix` — Fix GitHub Actions issues
- `gh-actions:check-manifest` — Check GitHub Actions manifest
- `gh-actions:fix-manifest` — Fix GitHub Actions manifest
- `test:gh-actions` — Test GitHub Actions upgrade logic

---

## CIC (Cast Iron Cloak) Scripts

- `cic-ui:repair` — Repair CIC UI layer
- `cic-ui:validate` — Validate CIC UI integrity
- `cic-ui:smoke` — Run CIC UI smoke tests
- `cic-ui:sentinel` — CIC UI drift sentinel
- `cic-ui:snapshot` — Generate CIC UI golden master
- `cic-ui:telemetry` — CIC UI telemetry hooks
- `cic:evolution-loop` — CIC evolution loop runner
- `cic:evolution-challenge` — CIC evolution challenge runner
- `cic:amb-run` — CIC AMB runner

---

## ARL (Autonomy Reasoning Layer) Scripts

- `arl:build:7.12` — Build ThresholdModel (Phase 7.12)
- `arl:build:7.13` — Build GovernanceHookExecutor (Phase 7.13)
- `arl:build:7.14` — Build SelfDiagnosticsEngine (Phase 7.14)
- `test:arl` — Test ARL implementation

---

## Utility & Testing Scripts

- `test:orchestrator` — Test CIC orchestrator
- `test:phase4.4` — Test RepositoryIngestion (Phase 4.4)
- `test:repomix:determinism` — Test repomix determinism
- `bench:repomix:compression` — Benchmark repomix compression
- `stress-test` — Run stress tests
- `validate-design` — Validate UI design
- `load-tokens` — Load auth tokens
- `ci` — Master CI script (bench:metadata → test:rewrite-labs)

---

## Cost & Reporting Scripts

- `cost:reports` — Generate cost reports
- `cost:helm` — Generate Helm dashboard cost report

---

## Validation Rules

**Before removing any npm script:**
1. Search for calls in `.github/workflows/*.yml`
2. Run `npm run validate-npm-scripts` (fails if workflow calls missing script)
3. Update this registry if script is intentionally removed

**Before adding workflow npm run calls:**
1. Ensure script exists in package.json
2. Document in appropriate section above
3. Run `npm run validate-npm-scripts` to verify

---

## CI/CD Integration

Script validation runs in CI:
- Pre-commit: `scripts/validate-npm-scripts.js` checks all workflow scripts exist
- CI job: `npm run validate-npm-scripts` (fails build if mismatch detected)

See `.github/workflows/` for integration points.
