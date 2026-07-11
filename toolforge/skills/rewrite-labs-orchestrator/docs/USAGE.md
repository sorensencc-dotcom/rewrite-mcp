# Rewrite Labs Orchestrator Usage

The Rewrite Labs Orchestrator handles stage transition and unblocks development processes.

## Execution

Import the module in your code:

```typescript
import { orchestratePipeline } from 'rewrite-labs-orchestrator';
const result = orchestratePipeline({
  pipelineState: {
    stages: [
      { name: 'compile', status: 'complete' },
      { name: 'test', status: 'blocked' }
    ]
  }
});
console.log(result.nextSteps); // ['Unblock: test']
```
