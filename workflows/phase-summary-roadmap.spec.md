# Workflow Spec: Phase Summary → Roadmap Update

**Workflow ID:** `phase-summary-roadmap`  
**Phase:** 44.2  
**Status:** Specification  
**Version:** 1.0.0  

---

## Overview

Summarizes a CIC/MEE phase across multiple sections, validates completeness, updates the roadmap with progress, and generates next-step procedures.

**Use Case:** Daily phase checkpoint for operators  
**Invoked By:** Claude Code, Operator Console, CI/CD  
**Typical Duration:** 2–5 seconds per section  

---

## Inputs

### Required

```typescript
interface PhaseWorkflowInput {
  phaseId: string;           // e.g., "phase-44.0", "phase-45.1"
  sectionIds: string[];      // e.g., ["§0.4", "§0.5", "§0.6"]
  roadmap: object;           // Current roadmap object
}
```

### Optional

```typescript
interface PhaseWorkflowInputOptional {
  artifacts?: string[];      // File paths to summarize (e.g., ["src/phase44/**/*.ts"])
  tests?: string[];          // Test identifiers (e.g., ["test:phase-44"])
  generateProcedure?: boolean; // Whether to generate next-step runbook (default: true)
}
```

### Complete Input Schema

```json
{
  "type": "object",
  "properties": {
    "phaseId": {
      "type": "string",
      "description": "Phase identifier (e.g., phase-44.0)"
    },
    "sectionIds": {
      "type": "array",
      "items": { "type": "string" },
      "description": "List of section IDs within phase"
    },
    "roadmap": {
      "type": "object",
      "description": "Current roadmap object"
    },
    "artifacts": {
      "type": "array",
      "items": { "type": "string" },
      "description": "File paths to analyze"
    },
    "tests": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Test identifiers"
    },
    "generateProcedure": {
      "type": "boolean",
      "description": "Generate next steps (default: true)"
    }
  },
  "required": ["phaseId", "sectionIds", "roadmap"]
}
```

---

## Outputs

### Success Response

```typescript
interface PhaseWorkflowOutput {
  phaseId: string;
  
  phaseSummary: {
    sections: Array<{
      sectionId: string;
      percentComplete: number;
      status: "not-started" | "in-progress" | "complete" | "blocked";
      blockers: string[];
      nextSteps: string[];
    }>;
    totalPercentComplete: number;
    aggregateStatus: "not-started" | "in-progress" | "complete" | "blocked";
  };
  
  validationReport: {
    phaseId: string;
    isValid: boolean;
    missingArtifacts: string[];
    missingTests: string[];
    testCoverage: number;
    recommendations: string[];
  };
  
  roadmapUpdate: {
    phaseId: string;
    percentComplete: number;
    suggestedVersion: string;
    newEntries: Array<{
      phaseId: string;
      description: string;
    }>;
    recommendation: string;
    updatedAt: string;
  };
  
  procedure?: {
    procedureId: string;
    steps: Array<{
      step: number;
      action: string;
      validation: string;
    }>;
    validationChecks: string[];
    errorBranches: Array<{
      condition: string;
      fallback: string;
    }>;
    estimatedDuration: number;
    riskLevel: "low" | "medium" | "high";
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
  type: "validation" | "skill" | "timeout" | "partial";
  
  validation?: {
    field: string;
    message: string;
  };
  
  skill?: {
    skillName: string;
    skillError: string;
    metadata: object;
  };
  
  partial?: {
    completed: string[];
    failed: string[];
    failureReasons: object;
  };
  
  timestamp: string;
  durationMs: number;
}
```

---

## Skill Chain

Invoked in sequence:

### 1. `cic-section-summarizer` (per section)

**Input:**
```javascript
{
  sectionId: "§0.4",
  files: artifacts // optional
}
```

**Output:**
```javascript
{
  sectionId: "§0.4",
  percentComplete: 75,
  status: "in-progress",
  blockers: ["Missing type definitions"],
  nextSteps: ["Complete tests", "Add documentation"]
}
```

**Purpose:** Summarize individual section progress

---

### 2. `phase-validator`

**Input:**
```javascript
{
  phaseSpec: {
    name: "phase-44.0",
    sections: ["§0.4", "§0.5", "§0.6"]
  },
  artifacts: artifacts,
  tests: tests
}
```

**Output:**
```javascript
{
  phaseId: "phase-44.0",
  isValid: true,
  missingArtifacts: [],
  missingTests: ["test:phase-44-integration"],
  testCoverage: 0.92,
  recommendations: ["Add integration tests"]
}
```

**Purpose:** Validate phase completeness and test coverage

---

### 3. `cic-roadmap-updater`

**Input:**
```javascript
{
  roadmap: { /* current roadmap */ },
  progress: {
    phaseId: "phase-44.0",
    percentComplete: 75,
    sectionSummaries: [ /* from step 1 */ ]
  }
}
```

**Output:**
```javascript
{
  phaseId: "phase-44.0",
  percentComplete: 75,
  suggestedVersion: "v2.5.0",
  newEntries: [
    {
      phaseId: "phase-44.1",
      description: "Claude Deployment (Phase 44.1)"
    }
  ],
  recommendation: "Bump to v2.5.0 and start phase 44.1",
  updatedAt: "2026-06-05T14:35:00Z"
}
```

**Purpose:** Update roadmap based on phase progress

---

### 4. `operator-grade-procedures` (optional)

**Input:**
```javascript
{
  task: "Complete phase 44.0 and start 44.1",
  environment: {
    currentPhase: "phase-44.0",
    targetPhase: "phase-44.1"
  }
}
```

**Output:**
```javascript
{
  procedureId: "phase-44-transition",
  steps: [
    {
      step: 1,
      action: "Tag release v2.5.0",
      validation: "Git tag exists"
    },
    {
      step: 2,
      action: "Update roadmap.json",
      validation: "JSON valid and version bumped"
    }
  ],
  validationChecks: ["All tests pass", "No breaking changes"],
  errorBranches: [
    {
      condition: "Tests fail on step 1",
      fallback: "Rollback tag and investigate"
    }
  ],
  estimatedDuration: 300,
  riskLevel: "low"
}
```

**Purpose:** Generate step-by-step procedures for phase transition

---

## Error Model

### Validation Errors (400-equivalent)

**Trigger:** Missing required fields or invalid types

```javascript
{
  error: true,
  type: "validation",
  validation: {
    field: "phaseId",
    message: "phaseId is required and must be a string"
  },
  timestamp: "2026-06-05T14:35:00Z",
  durationMs: 12
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
    skillName: "cic-section-summarizer",
    skillError: "Cannot read files: ENOENT",
    metadata: {
      sectionId: "§0.4",
      attemptedFiles: ["src/phase44/index.ts"]
    }
  },
  timestamp: "2026-06-05T14:35:00Z",
  durationMs: 1245
}
```

**Operator Action:** Check artifact paths and retry

---

### Partial Errors (207-equivalent)

**Trigger:** Some sections succeed, others fail

```javascript
{
  error: true,
  type: "partial",
  partial: {
    completed: ["§0.4", "§0.5"],
    failed: ["§0.6"],
    failureReasons: {
      "§0.6": "Tests missing for section"
    }
  },
  timestamp: "2026-06-05T14:35:00Z",
  durationMs: 3245
}
```

**Operator Action:** Review failed section and retry

---

### Timeout Errors (408-equivalent)

**Trigger:** Workflow exceeds 30s (configurable)

```javascript
{
  error: true,
  type: "timeout",
  skill: {
    skillName: "cic-roadmap-updater",
    skillError: "Timeout after 30000ms"
  },
  timestamp: "2026-06-05T14:35:00Z",
  durationMs: 30012
}
```

**Operator Action:** Increase timeout or split into smaller phases

---

## Telemetry

### Recorded Metrics

```typescript
interface PhaseWorkflowTelemetry {
  workflowId: "phase-summary-roadmap";
  invocationId: string;           // Unique per run
  phaseId: string;
  timestamp: string;
  
  // Execution
  totalDurationMs: number;
  skillDurations: {
    "cic-section-summarizer": number[];  // Array (one per section)
    "phase-validator": number;
    "cic-roadmap-updater": number;
    "operator-grade-procedures": number;
  };
  
  // Results
  sectionsProcessed: number;
  sectionsSuccessful: number;
  sectionsFailed: number;
  
  // Validation
  testCoveragePercent: number;
  artifactsFound: number;
  artifactsMissing: number;
  
  // Roadmap
  versionBumped: boolean;
  oldVersion: string;
  newVersion: string;
  
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
  workflowId: "phase-summary-roadmap",
  invocationId: "inv-a1b2c3d4",
  phaseId: "phase-44.0",
  timestamp: "2026-06-05T14:35:00Z",
  totalDurationMs: 2845,
  skillDurations: {
    "cic-section-summarizer": [245, 312, 289],
    "phase-validator": 156,
    "cic-roadmap-updater": 234,
    "operator-grade-procedures": 123
  },
  sectionsProcessed: 3,
  sectionsSuccessful: 3,
  sectionsFailed: 0,
  testCoveragePercent: 92,
  artifactsFound: 12,
  artifactsMissing: 0,
  versionBumped: true,
  oldVersion: "v2.4.0",
  newVersion: "v2.5.0",
  errors: []
}
```

---

## Context Usage

### Writes

**After successful phase summary:**

```javascript
runtime.setContext("phase", "current", "phase-44.0", 3600000);  // 1h TTL
runtime.setContext("phase", "lastSummary", phaseSummary, 7200000);  // 2h TTL
runtime.setContext("roadmap", "lastVersion", "v2.5.0", 86400000);  // 24h TTL
```

### Reads

**Before starting workflow:**

```javascript
const currentPhase = runtime.getContext("phase").current;
const lastRoadmapVersion = runtime.getContext("roadmap").lastVersion;

// Optional: Use for trend analysis or dependency checking
const previousSummary = runtime.getContext("phase").lastSummary;
```

---

## Example Invocation

### From Claude Code

```
Summarize phase 44.0 and update the roadmap.
- Sections: §0.4, §0.5, §0.6
- Artifacts: src/phase44/**/*.ts
- Tests: test:phase-44
```

### Programmatic

```javascript
import { runtime } from "../../skills-runtime/index.js";

const result = await runtime.invokeSkill("phase-summary-roadmap", {
  phaseId: "phase-44.0",
  sectionIds: ["§0.4", "§0.5", "§0.6"],
  roadmap: currentRoadmap,
  artifacts: ["src/phase44/**/*.ts"],
  tests: ["test:phase-44"],
  generateProcedure: true
});
```

---

## Example Output

```json
{
  "phaseId": "phase-44.0",
  "phaseSummary": {
    "sections": [
      {
        "sectionId": "§0.4",
        "percentComplete": 100,
        "status": "complete",
        "blockers": [],
        "nextSteps": []
      },
      {
        "sectionId": "§0.5",
        "percentComplete": 85,
        "status": "in-progress",
        "blockers": ["Missing integration tests"],
        "nextSteps": ["Add test suite", "Validate with QA"]
      },
      {
        "sectionId": "§0.6",
        "percentComplete": 75,
        "status": "in-progress",
        "blockers": ["Documentation incomplete"],
        "nextSteps": ["Write API docs", "Add examples"]
      }
    ],
    "totalPercentComplete": 87,
    "aggregateStatus": "in-progress"
  },
  "validationReport": {
    "phaseId": "phase-44.0",
    "isValid": true,
    "missingArtifacts": [],
    "missingTests": [],
    "testCoverage": 0.92,
    "recommendations": ["Increase test coverage to 95%"]
  },
  "roadmapUpdate": {
    "phaseId": "phase-44.0",
    "percentComplete": 87,
    "suggestedVersion": "v2.5.0",
    "newEntries": [
      {
        "phaseId": "phase-44.1",
        "description": "Claude Deployment (Phase 44.1)"
      }
    ],
    "recommendation": "Bump to v2.5.0 and begin phase 44.1",
    "updatedAt": "2026-06-05T14:35:00Z"
  },
  "procedure": {
    "procedureId": "phase-44-transition",
    "steps": [
      {
        "step": 1,
        "action": "Tag release v2.5.0",
        "validation": "Git tag exists and matches"
      },
      {
        "step": 2,
        "action": "Update roadmap.json with phase 44.1",
        "validation": "JSON valid, version field updated"
      },
      {
        "step": 3,
        "action": "Run phase 44.1 kickoff tests",
        "validation": "All tests pass"
      }
    ],
    "validationChecks": [
      "All phase 44.0 tests pass",
      "No breaking changes detected",
      "Documentation complete"
    ],
    "errorBranches": [
      {
        "condition": "Tests fail at step 1",
        "fallback": "Investigate failures and fix before continuing"
      },
      {
        "condition": "Roadmap validation fails",
        "fallback": "Rollback JSON changes and verify schema"
      }
    ],
    "estimatedDuration": 420,
    "riskLevel": "low"
  },
  "metadata": {
    "workflowDuration": 2845,
    "skillChainUsed": [
      "cic-section-summarizer",
      "phase-validator",
      "cic-roadmap-updater",
      "operator-grade-procedures"
    ],
    "timestamp": "2026-06-05T14:35:00Z",
    "errors": []
  }
}
```

---

## Notes

- **Idempotency:** Workflow is safe to run multiple times. Context writes use TTL to prevent stale data.
- **Partial Failure:** If sections 1–2 pass but section 3 fails, output includes partial results with `metadata.errors`.
- **Skill Dependencies:** No cross-skill dependencies in this workflow. Can be parallelized per section if needed.
- **Timeout:** Default 30s per skill. Total workflow typically 2–5s.

---

**Status:** Ready for implementation (Phase 44.2-A)  
**Next:** Scaffold generation (Phase 44.2-B)

