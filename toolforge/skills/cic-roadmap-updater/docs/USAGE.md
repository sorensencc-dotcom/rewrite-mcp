# CIC Roadmap Updater Usage

The CIC Roadmap Updater computes percent completion on roadmaps and suggests version bumps.

## Execution

Import the module in your code:

```typescript
import { updateRoadmap } from 'cic-roadmap-updater';
const result = updateRoadmap({
  roadmap: { version: '1.0.0', phases: ['setup', 'build'] },
  progress: { completedPhases: ['setup'], newItems: [] }
});
console.log(result.suggestedVersion); // '1.1.0' (50% progress)
```
