# Integration Flow Diagram

Architecture of the Active Focus loop guardrail and benchmark evaluation engine within Toolforge.

```mermaid
flowchart TD
    Client["Client Workflow Request"] --> Dispatcher["Toolforge Orchestrator"]
    Dispatcher --> Runner["Evaluation Runner / Agent Runtime"]
    
    subgraph GuardrailMiddleware["Active Focus Guardrail Middleware"]
        Runner --> TraceRecord["Record Action Trace"]
        TraceRecord --> Canonicalize["Canonicalize Arguments"]
        Canonicalize --> TurnCeilingCheck{"Turn Count >= Max Turns?"}
        TurnCeilingCheck -- Yes --> TripMaxTurns["Trip: MAX_TURNS_EXCEEDED"]
        TurnCeilingCheck -- No --> RetryLimitCheck{"Consecutive Failures >= 3?"}
        RetryLimitCheck -- Yes --> TripRetryLimit["Trip: CONSECUTIVE_RETRY_LIMIT"]
        RetryLimitCheck -- No --> CycleDetector{"Windowed Pattern Match (Lengths 1-5)?"}
        CycleDetector -- Yes --> TripCycle["Trip: CYCLE_DETECTED"]
        CycleDetector -- No --> AllowAction["Status: HEALTHY (Execute Tool)"]
    end

    TripMaxTurns --> EscalationPayload["Generate Escalation Payload"]
    TripRetryLimit --> EscalationPayload
    TripCycle --> EscalationPayload
    EscalationPayload --> HumanReview["Escalate to Human Approval Queue"]
    
    AllowAction --> ModelApi["Meta Muse Wonder API (Active Focus)"]
    ModelApi --> PrivacyCheck{"Privacy Audit Compliance"}
    PrivacyCheck -- Pass --> MetricsEngine["Token Economics and Latency Metrics"]
    PrivacyCheck -- Fail --> AlertAdmin["Log Privacy Violation Alert"]
```

## Component Linkages

- Input requests arrive from [src/index.mjs](file:///C:/dev/.worktrees/eval-muse-wonder/toolforge/skills/evaluate-muse-wonder-active-focus/src/index.mjs).
- State evaluation and pattern detection occur in [src/loop-guard.mjs](file:///C:/dev/.worktrees/eval-muse-wonder/toolforge/skills/evaluate-muse-wonder-active-focus/src/loop-guard.mjs).
- Scenario simulation and economics profiling occur in [src/evaluation-engine.mjs](file:///C:/dev/.worktrees/eval-muse-wonder/toolforge/skills/evaluate-muse-wonder-active-focus/src/evaluation-engine.mjs).
