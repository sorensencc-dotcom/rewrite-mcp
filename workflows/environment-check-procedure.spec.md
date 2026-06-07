# Workflow Spec: Environment Check → Procedure Generation

**Workflow ID:** `environment-check-procedure`  
**Phase:** 44.2  
**Status:** Specification  
**Version:** 1.0.0  

---

## Overview

Validates developer environment (Windows, WSL2, Node, Python, MCP), diagnoses issues from logs, and generates fix procedures with estimated runtime.

**Use Case:** Onboarding, troubleshooting, pre-deployment validation  
**Invoked By:** Claude Code, CI/CD, Developer setup  
**Typical Duration:** 1–3 seconds  

---

## Inputs

### Required

```typescript
interface EnvironmentWorkflowInput {
  envConfig: {
    os: string;           // "win32" | "linux" | "darwin"
    nodeVersion: string;  // e.g., "18.0.0"
  };
  logs: string[];         // Error/warning logs to analyze
}
```

### Optional

```typescript
interface EnvironmentWorkflowInputOptional {
  wslVersion?: string;              // "WSL1" | "WSL2"
  pythonVersion?: string;           // e.g., "3.11"
  mcpStatus?: string;               // MCP server status
  generateProcedure?: boolean;      // Whether to generate fix steps (default: true)
  generateRuntimeEstimate?: boolean; // Include machine-time estimate (default: true)
}
```

### Complete Input Schema

```json
{
  "type": "object",
  "properties": {
    "envConfig": {
      "type": "object",
      "properties": {
        "os": { "type": "string" },
        "nodeVersion": { "type": "string" },
        "wslVersion": { "type": "string" },
        "pythonVersion": { "type": "string" },
        "mcpStatus": { "type": "string" }
      },
      "required": ["os", "nodeVersion"]
    },
    "logs": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Log lines to diagnose"
    },
    "generateProcedure": {
      "type": "boolean",
      "description": "Generate fix steps (default: true)"
    },
    "generateRuntimeEstimate": {
      "type": "boolean",
      "description": "Include runtime estimate (default: true)"
    }
  },
  "required": ["envConfig", "logs"]
}
```

---

## Outputs

### Success Response

```typescript
interface EnvironmentWorkflowOutput {
  envValidation: {
    os: string;
    nodeVersion: string;
    pythonVersion?: string;
    wslVersion?: string;
    mcpStatus?: string;
    
    status: "ready" | "degraded" | "broken";
    isCompatible: boolean;
    
    issues: Array<{
      component: string;
      severity: "warning" | "error";
      message: string;
    }>;
    
    recommendations: string[];
  };
  
  envDiagnostics: {
    issuesFound: number;
    issues: Array<{
      pattern: string;
      rootCause: string;
      affectedComponent: string;
    }>;
    rootCauses: string[];
    fixes: string[];
    overallHealth: "healthy" | "degraded" | "critical";
  };
  
  procedure?: {
    procedureId: string;
    title: string;
    steps: Array<{
      step: number;
      action: string;
      validation: string;
      estimatedTimeSeconds: number;
    }>;
    validationChecks: string[];
    errorBranches: Array<{
      condition: string;
      fallback: string;
    }>;
    estimatedDuration: number;  // Total seconds
    riskLevel: "low" | "medium" | "high";
    prerequisites: string[];
  };
  
  runtimeEstimate?: {
    taskType: "environment-fix";
    estimatedMs: number;
    estimatedSeconds: number;
    baselineLatency: number;
    parallelizationFactor: number;
  };
  
  metadata: {
    workflowDuration: number;
    skillChainUsed: string[];
    timestamp: string;
    errors: Array<{
      skill: string;
      message: string;
      severity: "warning" | "error";
    }>;
  };
}
```

### Error Response

```typescript
interface WorkflowError {
  error: true;
  type: "validation" | "skill" | "timeout";
  
  validation?: {
    field: string;
    message: string;
  };
  
  skill?: {
    skillName: string;
    skillError: string;
    metadata: object;
  };
  
  timestamp: string;
  durationMs: number;
}
```

---

## Skill Chain

Invoked in sequence:

### 1. `environment-validator`

**Input:**
```javascript
{
  os: "win32",
  nodeVersion: "18.0.0",
  wslVersion: "WSL2",
  pythonVersion: "3.11",
  mcpStatus: "running"
}
```

**Output:**
```javascript
{
  os: "win32",
  nodeVersion: "18.0.0",
  pythonVersion: "3.11",
  wslVersion: "WSL2",
  mcpStatus: "running",
  status: "ready",
  isCompatible: true,
  issues: [],
  recommendations: []
}
```

**Purpose:** Validate environment against compatibility matrix

---

### 2. `environment-diagnostics`

**Input:**
```javascript
{
  logs: [
    "Error: ENOENT: no such file or directory",
    "at Object.openSync (fs.js:476:3)",
    "at Object.readFileSync (fs.js:356:3)"
  ],
  systemInfo: {
    os: "win32",
    nodeVersion: "18.0.0"
  }
}
```

**Output:**
```javascript
{
  issuesFound: 1,
  issues: [
    {
      pattern: "ENOENT",
      rootCause: "File path does not exist",
      affectedComponent: "File system"
    }
  ],
  rootCauses: ["Missing file or incorrect path"],
  fixes: [
    "Check file path exists",
    "Verify read permissions",
    "Use absolute path instead of relative"
  ],
  overallHealth: "degraded"
}
```

**Purpose:** Analyze logs and diagnose root causes

---

### 3. `operator-grade-procedures`

**Input:**
```javascript
{
  task: "Fix environment issues and set up MCP server",
  environment: {
    os: "win32",
    nodeVersion: "18.0.0",
    wslVersion: "WSL2",
    issues: ["Missing file", "MCP server not responding"]
  }
}
```

**Output:**
```javascript
{
  procedureId: "env-fix-20260605",
  title: "Repair Windows/WSL2 Environment",
  steps: [
    {
      step: 1,
      action: "Verify file paths in .env and config files",
      validation: "All paths resolve without errors",
      estimatedTimeSeconds: 60
    },
    {
      step: 2,
      action: "Restart MCP server: npx mcp-server",
      validation: "Server starts without errors",
      estimatedTimeSeconds: 30
    },
    {
      step: 3,
      action: "Run environment validation test",
      validation: "Test passes",
      estimatedTimeSeconds: 45
    }
  ],
  validationChecks: [
    "No ENOENT errors in logs",
    "MCP server is responsive",
    "Node.js version matches requirement"
  ],
  errorBranches: [
    {
      condition: "File still not found after step 1",
      fallback: "Create missing file or update path configuration"
    },
    {
      condition: "MCP server fails to start",
      fallback: "Check Node.js installation and MCP dependencies"
    }
  ],
  estimatedDuration: 180,
  riskLevel: "low",
  prerequisites: ["Administrator access on Windows", "WSL2 running"]
}
```

**Purpose:** Generate step-by-step fix procedures

---

### 4. `runtime-time-estimator` (optional)

**Input:**
```javascript
{
  tokens: 5000,
  calls: 3,
  parallelism: 1,
  modelThroughput: 200,
  baseLatency: 300,
  sandboxOverhead: 50,
  validationOverhead: 10
}
```

**Output:**
```javascript
{
  tokens: 5000,
  calls: 3,
  parallelism: 1,
  modelThroughput: 200,
  estimated_ms: 25300,
  estimated_seconds: 25.3
}
```

**Purpose:** Estimate machine-time for fix procedures

---

## Error Model

### Validation Errors (400-equivalent)

**Trigger:** Missing required fields or invalid types

```javascript
{
  error: true,
  type: "validation",
  validation: {
    field: "envConfig.os",
    message: "envConfig.os is required (e.g., 'win32')"
  },
  timestamp: "2026-06-05T14:35:00Z",
  durationMs: 8
}
```

**Operator Action:** Provide missing field and retry

---

### Skill Errors (500-equivalent)

**Trigger:** Skill execution fails

```javascript
{
  error: true,
  type: "skill",
  skill: {
    skillName: "environment-diagnostics",
    skillError: "Cannot parse logs: invalid format",
    metadata: {
      logCount: 3,
      firstError: "Line 1 is not a string"
    }
  },
  timestamp: "2026-06-05T14:35:00Z",
  durationMs: 145
}
```

**Operator Action:** Format logs properly and retry

---

### Timeout Errors (408-equivalent)

**Trigger:** Workflow exceeds 30s

```javascript
{
  error: true,
  type: "timeout",
  skill: {
    skillName: "operator-grade-procedures",
    skillError: "Timeout after 30000ms"
  },
  timestamp: "2026-06-05T14:35:00Z",
  durationMs: 30012
}
```

**Operator Action:** Increase timeout or simplify task

---

## Telemetry

### Recorded Metrics

```typescript
interface EnvironmentWorkflowTelemetry {
  workflowId: "environment-check-procedure";
  invocationId: string;
  timestamp: string;
  
  // Execution
  totalDurationMs: number;
  skillDurations: {
    "environment-validator": number;
    "environment-diagnostics": number;
    "operator-grade-procedures": number;
    "runtime-time-estimator": number;
  };
  
  // Validation
  envStatus: "ready" | "degraded" | "broken";
  isCompatible: boolean;
  issuesFound: number;
  
  // Diagnostics
  logEntriesAnalyzed: number;
  rootCausesIdentified: number;
  fixesRecommended: number;
  
  // Procedure
  stepsGenerated: number;
  estimatedFixTimeSeconds: number;
  riskLevel: "low" | "medium" | "high";
  
  // Runtime Estimate
  machineTimeEstimateSeconds?: number;
  
  // Errors
  errors: Array<{
    skill: string;
    message: string;
    severity: "warning" | "error";
  }>;
}
```

### Telemetry Output

```javascript
{
  workflowId: "environment-check-procedure",
  invocationId: "inv-e5f6g7h8",
  timestamp: "2026-06-05T14:35:00Z",
  totalDurationMs: 1456,
  skillDurations: {
    "environment-validator": 234,
    "environment-diagnostics": 456,
    "operator-grade-procedures": 312,
    "runtime-time-estimator": 189
  },
  envStatus: "degraded",
  isCompatible: true,
  issuesFound: 2,
  logEntriesAnalyzed: 8,
  rootCausesIdentified: 2,
  fixesRecommended: 5,
  stepsGenerated: 3,
  estimatedFixTimeSeconds: 180,
  riskLevel: "low",
  machineTimeEstimateSeconds: 25.3,
  errors: []
}
```

---

## Context Usage

### Writes

**After successful environment check:**

```javascript
runtime.setContext("environment", "lastCheck", envValidation, 3600000);  // 1h TTL
runtime.setContext("environment", "issues", envDiagnostics.issues, 1800000);  // 30m TTL
runtime.setContext("environment", "lastProcedure", procedure, 7200000);  // 2h TTL
```

### Reads

**Before starting workflow:**

```javascript
const lastEnvCheck = runtime.getContext("environment").lastCheck;
const previousIssues = runtime.getContext("environment").issues;

// Optional: Use for trend analysis or issue tracking
if (lastEnvCheck && lastEnvCheck.status === "ready") {
  // Environment was healthy — skip validation
}
```

---

## Example Invocation

### From Claude Code

```
Check my environment and generate a fix procedure.

Windows 11, Node 18.0.0, WSL2.

Recent errors:
- Error: ENOENT: no such file or directory
- MCP server not responding
```

### Programmatic

```javascript
import { runtime } from "../../skills-runtime/index.js";

const result = await runtime.invokeSkill("environment-check-procedure", {
  envConfig: {
    os: "win32",
    nodeVersion: "18.0.0",
    wslVersion: "WSL2",
    pythonVersion: "3.11"
  },
  logs: [
    "Error: ENOENT: no such file or directory",
    "Error: MCP server connection refused"
  ],
  generateProcedure: true,
  generateRuntimeEstimate: true
});
```

---

## Example Output

```json
{
  "envValidation": {
    "os": "win32",
    "nodeVersion": "18.0.0",
    "pythonVersion": "3.11",
    "wslVersion": "WSL2",
    "mcpStatus": "not-responding",
    "status": "degraded",
    "isCompatible": true,
    "issues": [
      {
        "component": "MCP Server",
        "severity": "error",
        "message": "MCP server not responding to health check"
      },
      {
        "component": "File System",
        "severity": "warning",
        "message": "Path resolution issues detected"
      }
    ],
    "recommendations": [
      "Restart MCP server",
      "Verify file paths in configuration",
      "Check network connectivity"
    ]
  },
  "envDiagnostics": {
    "issuesFound": 2,
    "issues": [
      {
        "pattern": "ENOENT",
        "rootCause": "Configuration file path does not exist",
        "affectedComponent": "File System"
      },
      {
        "pattern": "connection refused",
        "rootCause": "MCP server process not running or port blocked",
        "affectedComponent": "MCP Server"
      }
    ],
    "rootCauses": [
      "Configuration file .env.local not found",
      "MCP server crashed or failed to start"
    ],
    "fixes": [
      "Copy .env.example to .env.local",
      "Restart MCP server with 'npm run mcp:server'",
      "Check Windows Firewall settings"
    ],
    "overallHealth": "degraded"
  },
  "procedure": {
    "procedureId": "env-fix-20260605",
    "title": "Repair Windows/WSL2 Development Environment",
    "steps": [
      {
        "step": 1,
        "action": "Copy configuration from template: cp .env.example .env.local",
        "validation": ".env.local exists and is readable",
        "estimatedTimeSeconds": 15
      },
      {
        "step": 2,
        "action": "Restart MCP server: npm run mcp:server",
        "validation": "Server logs show 'Server started on stdio'",
        "estimatedTimeSeconds": 30
      },
      {
        "step": 3,
        "action": "Run environment validation: npm run test:env",
        "validation": "All tests pass without errors",
        "estimatedTimeSeconds": 45
      }
    ],
    "validationChecks": [
      "Configuration file path resolves correctly",
      "MCP server responds to health check",
      "No ENOENT errors in logs"
    ],
    "errorBranches": [
      {
        "condition": "MCP server still fails to start",
        "fallback": "Check Node.js version (must be 16+) and npm dependencies"
      },
      {
        "condition": "Test fails with permission error",
        "fallback": "Run with administrator privileges and check file ownership"
      }
    ],
    "estimatedDuration": 120,
    "riskLevel": "low",
    "prerequisites": ["Administrator access", "npm installed"]
  },
  "runtimeEstimate": {
    "taskType": "environment-fix",
    "estimatedMs": 25300,
    "estimatedSeconds": 25.3,
    "baselineLatency": 300,
    "parallelizationFactor": 1.0
  },
  "metadata": {
    "workflowDuration": 1456,
    "skillChainUsed": [
      "environment-validator",
      "environment-diagnostics",
      "operator-grade-procedures",
      "runtime-time-estimator"
    ],
    "timestamp": "2026-06-05T14:35:00Z",
    "errors": []
  }
}
```

---

## Notes

- **Idempotency:** Workflow is safe to run multiple times. Context uses TTL.
- **Partial Information:** If some env vars are missing, diagnostics continues with available data.
- **Runtime Estimate:** Machine-time estimate is separate from human-time in procedure steps.
- **Timeout:** Default 30s per skill. Total workflow typically 1–3s.

---

**Status:** Ready for implementation (Phase 44.2-A)  
**Next:** Scaffold generation (Phase 44.2-B)

