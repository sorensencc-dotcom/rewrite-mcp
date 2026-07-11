# Integration Diagram

```mermaid
graph TD
  CodeFlow[CodeFlow Analyzer] -->|POST /analyze| Orchestrator[Plan Extractor Integration]
  Orchestrator -->|Parse and map| Extractor[CodeFlow Extractor]
  Extractor -->|Store nodes/edges/security/patterns/impact| Store[(CIC Store)]
```
