# CIC‑AI Runtime Diagram — v1.1.0

RTK Automation + PMS + Hybrid Harness

RRK‑AI ──► RTK Automation ──► CIC Ingestion ──► Index / Store
  ▲             │                  │
  │             │                  │
  │             ▼                  ▼
git‑ai ◄──── Governance ◄──── Section Tracking

Details:

- PMS:
  - Sits alongside Extractors and Harvester.
  - Extractors call PMS to build prompts.
  - Harvester attaches PMS metadata to results.

- RTK Automation:
  - Consumes RRK goals.
  - Plans ingestion bursts.
  - Runs smoke tests on section transitions.
  - Applies failure‑rate safeguards.
  - Emits governance feedback via CIC ↔ git‑ai path.

- Hybrid Harness:
  - Spins up PMS, Extractors, Harvester, RTK Automation, section tracking in‑process.
  - Uses fixtures to simulate RRK goals and section sequences.
  - Validates runtime behavior against the v1.0.0 contract.
