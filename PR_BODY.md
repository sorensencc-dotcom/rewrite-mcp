# CIC AI Runtime v1.0.0 Installation

Installs the CIC AI Runtime contract loader and agent integration patches. All agents (RTK, RRK, git-ai, CIC) now load and validate the canonical contract on startup.

## What's Included

- **Contract Loader** (`src/runtime/contract-loader.ts`): Reads `projects/cic/docs/CIC_AI_RUNTIME_CONTRACT.md`, extracts version and sections
- **RTK Integration**: Validates contract path and version at bootstrap
- **RRK Integration**: Enforces goal type and field validation
- **git-ai Integration**: Validates governance delta schema (semver versions, required fields)
- **CIC Integration**: Acknowledges contract and exposes version to dashboard health registry
- **GitHub Actions CI**: Validates contract file exists and has parsable `Version: X.Y.Z`

## Merge Gate Checklist

### Files and Placement
- [ ] `projects/cic/docs/CIC_AI_RUNTIME_CONTRACT.md` present and readable
- [ ] `src/runtime/contract-loader.ts` added and committed
- [ ] RTK, RRK, git-ai, and CIC patches present in commits

### Build and Tests
- [ ] `npm ci` completes without errors
- [ ] `npm test` passes (all contract tests green)
- [ ] No new lint errors introduced

### Runtime Contract Validation
- [ ] CI job `validate-runtime-contract` passes
- [ ] Agents load the contract in dev runs

### Runtime Activation Smoke Test
Run each agent in dev and verify logs:
- [ ] RTK: `[RTK] Loaded CIC AI Runtime Contract vX.Y.Z`
- [ ] RRK: `[RRK] CIC AI Runtime Contract vX.Y.Z loaded`
- [ ] git-ai: `[git-ai] Loaded CIC AI Runtime Contract vX.Y.Z`
- [ ] CIC: `[CIC] Acknowledged CIC AI Runtime Contract vX.Y.Z at ...`
- [ ] Dashboard health registry shows `runtime_contract` with `version: "1.0.0"`

### Docs and References
- [ ] `SYSTEM.md` contains Multi-Agent Runtime reference
- [ ] ROADMAP.md and STATE.md references updated

### Final Gate
- [ ] All checks green → merge to `main`

## Post-Merge

After merge, tag release:
```bash
git checkout main
git pull
git tag -a v1.0.0 -m "CIC-AI Runtime v1.0.0 — Contract Loader, Multi-Agent Integration, CI Validation"
git push origin v1.0.0
```
