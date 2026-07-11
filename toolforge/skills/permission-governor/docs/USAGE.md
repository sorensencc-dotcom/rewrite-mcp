# Permission Governor Usage

The Permission Governor whitelists safe operations to automate approvals.

## Execution

Import the module in your code:

```typescript
import { PermissionManager } from 'permission-governor';
const pm = new PermissionManager();
const result = pm.checkPermission('status', 'git:status');
console.log(result.requires); // false (auto-approved via whitelist)
```
