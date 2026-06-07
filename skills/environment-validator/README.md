# Environment Validator Skill (45.3)

**Purpose:** Fast health check (<500ms) for session startup. Validates Node.js, npm, critical paths, and environment variables.

## Input

No input required. The skill performs automatic environment checks.

```json
{
  "skipChecks": ["memory"] // Optional: checks to skip
}
```

## Output

```json
{
  "timestamp": "2026-06-07T20:57:16.441Z",
  "overallHealth": "healthy",
  "startupReady": true,
  "totalChecks": 5,
  "passed": 5,
  "failed": 0,
  "warnings": 0,
  "elapsedMs": 124,
  "checks": [
    {
      "check": "Node.js version",
      "status": "ok",
      "value": "v24.14.1",
      "passed": true,
      "required": "18.0.0+"
    }
  ],
  "recommendations": []
}
```

## Checks Performed

1. **Node.js version** — Validates v18.0.0+ (instant)
2. **npm availability** — Checks npm in environment (instant)
3. **Critical paths** — Verifies project root and skills directory exist (<100ms)
4. **Environment variables** — Checks NODE_ENV, ANTHROPIC_API_KEY (instant)
5. **Memory available** — Checks free memory using `os.freemem()` (instant)

## Examples

### Basic usage
```javascript
import { validateEnvironment } from "./skills/environment-validator/index.js";

const result = validateEnvironment();
console.log(result.overallHealth); // "healthy" or "degraded"
console.log(result.startupReady);  // true or false
```

### In session startup
```javascript
// Check environment before starting services
const health = validateEnvironment();
if (!health.startupReady) {
  console.error("Environment checks failed:", health.failedChecks);
  process.exit(1);
}
```

## Performance

- **Target:** <2s for session startup readiness check
- **Actual:** <500ms (typical: 100-150ms)
- **No external commands:** Uses only Node.js built-ins

## Differences from environment-diagnostics

| Aspect | environment-validator (45.3) | environment-diagnostics |
|--------|------------------------------|------------------------|
| Speed | <500ms (fast) | 2-5s (deep) |
| Purpose | Session startup | Troubleshooting issues |
| Checks | Node, npm, paths, env vars | Docker, WSL, MCP, system |
| Use case | Pre-flight check | Debugging |

## Status

- **Tests:** 5/5 passing
- **Performance:** ✅ Under 500ms
- **Production ready:** Yes
