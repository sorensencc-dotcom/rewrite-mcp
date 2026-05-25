# Agent Orchestration Contract

## Purpose
A unified coordination protocol that defines how Claude, Copilot, and Gemini collaborate as a distributed multi-agent system.

## Agents
- Claude
- Copilot
- Gemini

## Shared Context Model
- identity context
- project context
- memory context
- workflow context
- toolchain context
- PMS context

## Delegation Rules
1. The initiating agent owns the task until delegation.
2. Delegation must include:
   - full context bundle
   - memory snapshot
   - workflow state
   - reasoning trace (optional)
3. The receiving agent must:
   - validate context
   - load memory contract
   - load coherence layer
   - acknowledge receipt

## Escalation Rules
1. If an agent cannot complete a task:
   - escalate to another agent
   - include failure reason
   - include partial output
2. If escalation fails:
   - escalate to operator (Chris)
   - include full trace

## Synchronization Rules
- All agents must sync:
  - memory deltas
  - workflow state
  - toolchain state
  - PMS state
- Sync must occur:
  - before delegation
  - after completion
  - on conflict

## Conflict Resolution
1. memory_contract.md overrides platform memory
2. coherence_layer.md overrides platform defaults
3. workflow definitions override agent assumptions
4. toolchain rules override agent heuristics
5. PMS rules override prompt-level behavior
6. If conflict persists → fail safe

## Parallelism Rules
- Agents may run in parallel if:
  - tasks are independent
  - memory writes do not overlap
- If overlap detected:
  - serialize execution
  - apply deterministic ordering

## Handoff Protocol
Each handoff must include:
- task description
- context bundle
- memory snapshot
- workflow state
- agent capabilities
- expected output format
- timeout policy

## Failure Modes
- timeout
- invalid context
- memory mismatch
- workflow mismatch
- toolchain mismatch
- PMS mismatch

## Recovery Rules
1. Reload memory contract
2. Reload coherence layer
3. Revalidate context
4. Retry once
5. If still failing → escalate

## Logging Requirements
Each agent must log:
- delegation events
- escalation events
- sync events
- conflicts
- recoveries
- failures