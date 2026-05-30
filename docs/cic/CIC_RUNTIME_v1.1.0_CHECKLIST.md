# CIC‑AI Runtime v1.1.0 — Post‑Merge Verification Checklist

## Build & Tests

- [ ] `npm install` in `projects/cic` completed successfully
- [ ] `npm run build` passes
- [ ] `npm test` passes (63 tests)

## PMS Integration

- [ ] `GET /pms/templates` returns expected templates:
  - `image_analysis_v1`
  - `text_analysis_v1`
- [ ] Image and text ingestion paths include PMS metadata (`template`, `version`)

## RTK Automation

- [ ] `GET /rtk/automation/state` returns:
  - valid `version`
  - `open_bursts` array
  - `blocked_sections` array
- [ ] Healthy burst scenario:
  - RRK goals → bursts → jobs → completed
  - No sections blocked
- [ ] Failure‑rate safeguard scenario:
  - High failure burst blocks section
  - Governance feedback emitted with `burst_failure_rate_exceeded`

## Hybrid Harness

- [ ] Hybrid tests run as part of `npm test`
- [ ] Scenarios validated:
  - Healthy burst
  - Failure guard
  - PMS template error
  - Smoke gating
  - Observability

## Documentation

- [ ] `projects/cic/docs/CIC_SYSTEM.md` includes:
  - PMS subsystem
  - RTK Automation Layer
  - Hybrid Test Harness overview
- [ ] `CIC_AI_RUNTIME_v1.1.0_RELEASE_NOTES.md` committed
- [ ] `CIC_AI_RUNTIME_v1.1.0_DIAGRAM.md` committed

## Finalization

- [ ] Tag `v1.1.0` created and pushed
- [ ] Release notes published (internal or external as appropriate)
