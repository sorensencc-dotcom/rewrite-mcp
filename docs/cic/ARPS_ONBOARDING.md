# ARPS Onboarding Guide

## 1. What is ARPS?

ARPS is CIC’s Autonomous Roadmap & Prompt Sandbox subsystem. It:
- Keeps the roadmap and project state in sync with reality.
- Protects system prompts from accidental or unsafe changes.
- Runs as a pipeline you can invoke or schedule.

## 2. Key files

- `projects/cic/src/agents/roadmapping/harvester-agent.ts`  
- `projects/cic/src/agents/roadmapping/synthesizer-agent.ts`  
- `projects/cic/src/agents/roadmapping/prompt-sandbox.ts`  
- `projects/cic/src/agents/roadmapping/pipeline.ts`  
- `projects/cic/pms/registry.yaml`  
- `docs/cic/CIC_MASTER_ROADMAP.md` (ARPS fenced sections)  
- `docs/cic/CIC_PROJECT_STATE.md` (health + ascent fences)

## 3. How ARPS runs

1. Harvester reads git, tasks, and telemetry → emits `RoadmapDelta`.
2. Synthesizer rewrites fenced sections in docs.
3. PromptSandbox validates any prompt changes.
4. Docs build is run to ensure no breakage.
5. Git commit is created (in commit mode).

## 4. How to safely change prompts

1. Edit the prompt file under `projects/cic/pms/templates/...`.
2. Ensure the entry exists in `registry.yaml`.
3. Run ARPS in dry-run.
4. If similarity is too low, adjust the change or threshold (with owner approval).
5. Once accepted, run in commit mode.

## 5. How to extend ARPS

- Add new components to `RoadmapDelta`.
- Add new fenced regions to docs with `<!-- ARPS:...:BEGIN/END -->`.
- Update the synthesizer to handle new fences.
- Add tests in `roadmapping.test.ts` for new behavior.

## 6. When in doubt

- Run ARPS in dry-run.
- Read the operator manual.
- Check `HANDOFF.md` and `walkthrough.md` for Phase 22 details.
