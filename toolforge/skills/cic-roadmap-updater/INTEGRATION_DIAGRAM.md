# Integration Diagram

```mermaid
graph TD
  Roadmap[Roadmap JSON] --> Updater[Roadmap Updater]
  Progress[Progress JSON] --> Updater
  Updater -->|Calculate version bump| Suggestion[Suggested Version & Entries JSON]
```
