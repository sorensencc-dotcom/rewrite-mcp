# Context Manager Usage

The Context Manager detects whether the runtime environment is set up for autonomous execution to prevent prompting.

## Execution

Import the module in your code:

```typescript
import { loadContext } from 'context-manager';
const context = loadContext();
console.log(context.isAutonomous);
```
