# Integration Diagram

```mermaid
graph TD
  Env[Environment Variables] -->|AUTONOMOUS_EXECUTION=true| ContextManager[Context Manager]
  File[.autonomous-context.json] -->|Read/Write| ContextManager
```
