# Integration Diagram

```mermaid
graph TD
  Files[Staged/Active Files] --> Summarizer[Section Summarizer]
  Summarizer -->|Calculate status| Output[Progress Summary JSON]
```
