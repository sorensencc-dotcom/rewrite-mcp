# CIC Harvester v2.0.0

Semantic versioned harvester subsystem for Castironforge CIC.

## Layout

- `bridge/` — unified harvester bridge API
- `adapters/` — source-specific adapters (web, file, sidecar)
- `normalizers/` — content normalization layer

## Invariants

- All adapters return a unified HarvesterPayload.
- Normalizers are pure functions.
- Bridge is the only public entrypoint.
