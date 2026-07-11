# Agent Drift Detector Usage

This skill checks for drift between the expected structure and the actual output fields of an agent.

## Execution

Import the module in your code:

```typescript
import { detectDrift } from 'agent-drift-detector';
const result = detectDrift({
  agentName: 'writer-agent',
  expectedSchema: { text: 'string' },
  actualSchema: { content: 'string' }
});
console.log(result.driftDetected); // true (mismatch)
```
