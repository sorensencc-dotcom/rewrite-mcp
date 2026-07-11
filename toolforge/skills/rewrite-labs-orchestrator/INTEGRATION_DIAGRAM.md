# Integration Diagram

```mermaid
graph TD
  State[Pipeline State JSON] --> Orchestrator[Labs Orchestrator]
  Orchestrator -->|Determine transitions| NextSteps[Next Steps / Suggested Actions]
```
