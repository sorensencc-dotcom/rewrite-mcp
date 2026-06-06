# Permission Manager Integration Examples

Ready-to-use code for integrating permission checking into your MCP servers.

---

## Example 1: helm-server.js Integration

**Location:** `tools/mcp/helm-server.js`

**Add at the top (after existing imports):**

```javascript
import { checkPermission, recordApproval } from '../../.claude/permissions.js';
```

**Modify the tool handler** (find `handleToolCall` or equivalent):

```javascript
// BEFORE: (current code)
async function handleToolCall(name, args) {
  const result = await executeToolLogic(name, args);
  return result;
}

// AFTER: (with permission checking)
async function handleToolCall(name, args) {
  // Check permission first
  const permission = checkPermission('call', name, args);
  
  if (permission.requires && !permission.autoApproved) {
    // Tool requires approval and is NOT auto-whitelisted
    // Return error or ask for approval
    return {
      isError: true,
      content: [{
        type: 'text',
        text: `⚠️ Permission required: ${name}\n${permission.reason}`
      }]
    };
  }

  // Tool is whitelisted or cached - execute normally
  try {
    const result = await executeToolLogic(name, args);
    
    // Record successful execution
    recordApproval('call', name, true, permission.reason);
    
    return result;
  } catch (e) {
    recordApproval('call', name, false, `error: ${e.message}`);
    throw e;
  }
}
```

---

## Example 2: idea-inbox-server.js Integration

**Location:** `tools/mcp/idea-inbox-server.js`

**Add at the top:**

```javascript
import { checkPermission, recordApproval } from '../../.claude/permissions.js';
```

**Modify the tool call handler:**

```javascript
case 'tools/call': {
  const { name, arguments: args } = request.params;
  
  // Check permission
  const permission = checkPermission('call', name, args);
  
  if (permission.requires && !permission.autoApproved) {
    response = {
      result: {
        text: `Permission required for ${name}`
      }
    };
  } else {
    // Execute tool
    response = await handleToolCall(name, args);
    recordApproval('call', name, true, permission.reason);
  }
  break;
}
```

---

## Example 3: Custom MCP Server Template

If you're creating a new MCP server:

```javascript
#!/usr/bin/env node

import { Server } from '@anthropic-ai/sdk/lib/resources/Messages.js';
import { checkPermission, recordApproval } from '../.claude/permissions.js';

const server = new Server({
  name: 'my-server',
  version: '1.0.0',
});

server.setRequestHandler(async (request) => {
  if (request.method === 'tools/call') {
    const { name, arguments: args } = request.params;

    // ✅ CHECK PERMISSION FIRST
    const permission = checkPermission('call', name, args);
    
    if (permission.requires && !permission.autoApproved) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: `❌ Permission denied: ${name}`
        }]
      };
    }

    // ✅ EXECUTE TOOL
    try {
      const result = await executeTool(name, args);
      recordApproval('call', name, true, permission.reason);
      return { result };
    } catch (e) {
      recordApproval('call', name, false, e.message);
      throw e;
    }
  }
});

server.start();
```

---

## Example 4: Lightweight Wrapper (No Server Changes)

If you can't modify the MCP servers directly, wrap them:

**Create:** `tools/mcp/permission-wrapper.js`

```javascript
import { checkPermission, recordApproval } from '../../.claude/permissions.js';

/**
 * Wrap any tool call with permission checking
 */
export async function withPermission(toolName, executeFunc, args = {}) {
  // Check permission
  const permission = checkPermission('call', toolName, args);
  
  if (permission.requires && !permission.autoApproved) {
    throw new Error(`Permission required: ${toolName}`);
  }

  // Execute
  try {
    const result = await executeFunc(args);
    recordApproval('call', toolName, true, permission.reason);
    return result;
  } catch (e) {
    recordApproval('call', toolName, false, e.message);
    throw e;
  }
}

// Usage in any tool:
// import { withPermission } from './permission-wrapper.js'
// const result = await withPermission('helm:pri-search', 
//   async (args) => { ... tool logic ... }, 
//   args
// );
```

---

## Integration Checklist

When adding permission checking to an MCP server:

- [ ] Import `checkPermission` and `recordApproval` from `./.claude/permissions.js`
- [ ] Add permission check **before** tool execution
- [ ] Skip execution if `permission.requires && !permission.autoApproved`
- [ ] Call `recordApproval()` **after** successful execution
- [ ] Record errors via `recordApproval(..., false, error_message)`
- [ ] Test with a whitelisted tool (should not prompt)
- [ ] Test with a non-whitelisted tool (should block or ask)

---

## Testing Your Integration

**Test 1: Whitelisted tool (should auto-approve)**

```javascript
// helm:ideas-summary is whitelisted
const result = await mcp.callTool('helm:ideas-summary', {});
// ✅ Should execute without approval prompt
```

**Test 2: Non-whitelisted tool (should require approval)**

```javascript
// npm:deploy is NOT whitelisted
const result = await mcp.callTool('npm:deploy', {});
// ❌ Should return permission error
```

**Test 3: Cached approval (should not re-ask)**

```javascript
// First call to custom:operation
await mcp.callTool('custom:operation', {});
// Manually approves (outside auto-approval scope)

// Second call to same operation within 1 hour
await mcp.callTool('custom:operation', {});
// ✅ Should use cached decision, no re-ask
```

---

## Files to Modify

Priority order (easiest → hardest):

1. **`tools/mcp/helm-server.js`** ← Start here (largest impact)
2. **`tools/mcp/idea-inbox-server.js`** ← High-frequency operations
3. **Any other MCP servers** ← Apply same pattern

---

## Rollback

If something breaks, revert by:

1. Remove the import line from the MCP server
2. Remove the permission checking logic
3. Keep the tool execution logic as-is

The MCP servers will work normally without permission checking.

---

## Expected Impact After Integration

```
BEFORE integration:
  $ npm run helm:ideas-summary
  ⚠️ Approve tool call? (Y/n)  ← User has to click
  ⚠️ Approve tool call? (Y/n)  ← User has to click (15+ times/day)

AFTER integration:
  $ npm run helm:ideas-summary
  ✅ Executing... (no prompt)
  ✅ Executing... (no prompt)  
  → Approval friction eliminated for whitelisted tools
```
