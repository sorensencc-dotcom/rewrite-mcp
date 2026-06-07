# Rewrite Labs Regression Test Suite

This suite is modeled after Microsoft's markdown test harness.

It provides deterministic, snapshot-based regression testing for:

- Rewrite engine (Opus vs Sonnet)
- Rendering engines (Obscura vs Lightpanda)
- Screenshot-to-code
- Metadata extraction

## Structure

```
tests/
  rewrite/
    expected/        (golden HTML snapshots)
    runRewriteTests.ts
  render/
    expected/        (golden HTML snapshots)
    runRenderTests.ts
  stc/
    expected/        (golden HTML snapshots)
    runStcTests.ts
  metadata/
    expected/        (golden JSON snapshots)
    runMetadataTests.ts
  utils/
    snapshot.ts      (load/save golden files)
    diff.ts          (compare expected vs actual)
    generateStatus.ts (dashboard status)
  runAll.ts          (run all test suites)
  README.md
```

## Running Tests

### Run all tests

```bash
npx ts-node tests/runAll.ts
```

### Run individual test suite

```bash
npx ts-node tests/rewrite/runRewriteTests.ts
npx ts-node tests/render/runRenderTests.ts
npx ts-node tests/stc/runStcTests.ts
npx ts-node tests/metadata/runMetadataTests.ts
```

## Snapshot Management

### Creating snapshots

Snapshots are created automatically on first run.

```bash
npx ts-node tests/rewrite/runRewriteTests.ts
# Creates tests/rewrite/expected/*.html
```

### Updating snapshots

Delete the snapshot files and re-run:

```bash
rm tests/rewrite/expected/*.html
npx ts-node tests/rewrite/runRewriteTests.ts
```

### Reviewing diffs

Diffs are printed to stdout during test runs. For full visual comparison:

```bash
node tools/htmlDiffViewer.js
# Open http://localhost:3000
```

## Continuous Integration

Tests run automatically on:

1. **Pull requests** (on-demand with `npm run test:rewrite-labs`)
2. **Nightly** (every night at 3 AM ET via GitHub Actions)
3. **Manual trigger** (workflow_dispatch)

See `.github/workflows/nightly-bench.yml` for CI configuration.

## Dashboard

After running tests, generate the dashboard status:

```bash
npm run bench:status
```

This creates `benchmarks/out/status.json`, which powers the dashboard at:

```
benchmarks/out/dashboard.html
```

The dashboard is auto-published to GitHub Pages nightly.

## Notes

- All tests are deterministic and reproducible
- Snapshots are version-controlled for regression detection
- Tests can run offline (except screenshot-to-code, which requires an endpoint)
- Rendering tests use stub implementations; wire your actual renderers in `tests/render/runRenderTests.ts`
