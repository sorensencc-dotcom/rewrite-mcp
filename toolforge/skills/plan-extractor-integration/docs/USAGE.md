# Plan Extractor Integration Usage

This skill acts as the unified entry point for CodeFlow extraction into Content Intelligence Core (CIC) stores.

## Execution

Import the module in your code:

```typescript
import { createOrchestrator } from 'plan-extractor-integration';
const orchestrator = createOrchestrator('repo-1', 'C:\\dev', {
  storeNodes: async (nodes) => {},
  storeEdges: async (edges) => {},
  storeSecurity: async (issues) => {},
  storePatterns: async (patterns) => {},
  storeImpact: async (impact) => {}
});
await orchestrator.run();
```
