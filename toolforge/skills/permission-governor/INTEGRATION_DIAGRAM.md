# Integration Diagram

```mermaid
graph TD
  Request[Tool/Op Request] --> PermissionManager[Permission Manager]
  PermissionManager -->|Check config/cache| Decision{Whitelisted?}
  Decision -->|Yes| AutoApprove[Auto-Approve Operation]
  Decision -->|No| Prompt[Prompt User]
```
