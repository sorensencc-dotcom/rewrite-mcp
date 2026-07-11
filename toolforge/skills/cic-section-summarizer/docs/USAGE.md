# CIC Section Summarizer Usage

The CIC Section Summarizer aggregates and details the completeness of files within a section.

## Execution

Import the module in your code:

```typescript
import { summarizeSection } from 'cic-section-summarizer';
const result = summarizeSection({
  sectionId: 'phase-44.0',
  files: ['src/index.ts']
});
console.log(result.percentComplete);
```
