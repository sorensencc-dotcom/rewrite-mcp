# Workflow Spec: Pipeline Orchestration → Status Dashboard

**Workflow ID:** `pipeline-orchestration-dashboard`  
**Phase:** 44.2  
**Status:** Specification  
**Version:** 1.0.0  

---

## Overview

Orchestrates Rewrite Labs pipeline stages, detects blockers, generates daily brief, harvests ideas, and produces comprehensive operator dashboard.

**Use Case:** Daily RL operations, pipeline monitoring, blocker detection, idea capture  
**Invoked By:** Claude Code, Scheduled jobs, Operator Dashboard  
**Typical Duration:** 3–8 seconds  

---

## Inputs

### Required

```typescript
interface PipelineWorkflowInput {
  pipelineState: {
    stages: string[];        // e.g., ["Discovery", "Harvester", "Redesign"]
    current: string;         // Current stage
    status: string;          // "running" | "paused" | "blocked"
  };
  repoActivity: Array<{
    timestamp: string;
    event: string;
    message?: string;
  }>;
  agentActivity: Array<{
    timestamp: string;
    agentName: string;
    action: string;
    status: string;
  }>;
  ideaInbox: Array<{
    id: string;
    idea: string;
    source: string;
  }>;
}
```

### Optional

```typescript
interface PipelineWorkflowInputOptional {
  roadmap?: object;                  // Current roadmap (for context)
  generateProcedure?: boolean;       // Generate blocker fixes (default: true)
  harvestIdeas?: boolean;            // Process idea inbox (default: true)
  timeWindowDays?: number;           // Activity lookback (default: 1)
}
```

### Complete Input Schema

```json
{
  "type": "object",
  "properties": {
    "pipelineState": {
      "type": "object",
      "properties": {
        "stages": { "type": "array", "items": { "type": "string" } },
        "current": { "type": "string" },
        "status": { "type": "string" }
      },
      "required": ["stages", "current"]
    },
    "repoActivity": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "timestamp": { "type": "string" },
          "event": { "type": "string" },
          "message": { "type": "string" }
        }
      }
    },
    "agentActivity": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "timestamp": { "type": "string" },
          "agentName": { "type": "string" },
          "action": { "type": "string" },
          "status": { "type": "string" }
        }
      }
    },
    "ideaInbox": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "idea": { "type": "string" },
          "source": { "type": "string" }
        }
      }
    },
    "roadmap": { "type": "object" },
    "generateProcedure": { "type": "boolean" },
    "harvestIdeas": { "type": "boolean" },
    "timeWindowDays": { "type": "number" }
  },
  "required": ["pipelineState", "repoActivity", "agentActivity", "ideaInbox"]
}
```

---

## Outputs

### Success Response

```typescript
interface PipelineWorkflowOutput {
  orchestration: {
    totalStages: number;
    completedStages: number;
    blockedStages: number;
    progressPercent: number;
    
    stageStatus: Array<{
      stage: string;
      status: "not-started" | "in-progress" | "blocked" | "complete";
      progress: number;
      blockers: string[];
      owner?: string;
    }>;
    
    dependencies: Array<{
      from: string;
      to: string;
      isBlocked: boolean;
    }>;
    
    nextSteps: string[];
    estimatedTimeToComplete: number;  // seconds
  };
  
  sessionBoundary: {
    messageCount: number;
    contextDriftScore: number;         // 0–1, where 1 = maximum drift
    isOverflowing: boolean;
    recommendations: string[];
    suggestedAction: "continue" | "split" | "summarize";
  };
  
  dailyBrief: {
    reportDate: string;
    reportPeriod: string;              // e.g., "2026-06-04 to 2026-06-05"
    
    executiveSummary: string;
    
    pipelineStatus: {
      stage: string;
      blockers: number;
      progressPercent: number;
    };
    
    recentActivity: string[];
    agentPerformance: Array<{
      agentName: string;
      tasksCompleted: number;
      tasksBlocked: number;
      successRate: number;
    }>;
    
    keyDecisions: string[];
    recommendations: string[];
  };
  
  harvestedIdeas?: {
    ideasProcessed: number;
    ideasAccepted: number;
    ideasRejected: number;
    ideasNeedingReview: number;
    
    structured: Array<{
      id: string;
      idea: string;
      source: string;
      category: string;
      priority: "low" | "medium" | "high" | "critical";
      phaseTarget?: string;
      recommendation: string;
    }>;
  };
  
  procedure?: {
    procedureId: string;
    title: string;
    blockerCount: number;
    steps: Array<{
      step: number;
      action: string;
      targetBlocker: string;
      validation: string;
      estimatedTimeSeconds: number;
    }>;
    validationChecks: string[];
    errorBranches: Array<{
      condition: string;
      fallback: string;
    }>;
    estimatedDuration: number;
    riskLevel: "low" | "medium" | "high";
  };
  
  dashboard: {
    dataPoints: number;
    visualizations: Array<{
      type: "timeline" | "progress" | "dependency" | "heatmap";
      title: string;
      data: object;
    }>;
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
  };
  
  timestamp: string;
  durationMs: number;
}
```

---

## Skill Chain

Invoked in sequence with shared context:

### 1. `rewrite-labs-orchestrator`

**Input:**
```javascript
{
  pipelineState: {
    stages: ["Discovery", "Harvester", "Redesign", "Outreach", "Delivery"],
    current: "Redesign",
    status: "blocked"
  }
}
```

**Output:**
```javascript
{
  totalStages: 5,
  completedStages: 2,
  blockedStages: 1,
  progressPercent: 40,
  stageStatus: [
    {
      stage: "Discovery",
      status: "complete",
      progress: 100,
      blockers: [],
      owner: "Agent-A"
    },
    {
      stage: "Harvester",
      status: "complete",
      progress: 100,
      blockers: [],
      owner: "Agent-B"
    },
    {
      stage: "Redesign",
      status: "blocked",
      progress: 60,
      blockers: ["Waiting for design approval"],
      owner: "Agent-C"
    }
  ],
  dependencies: [
    { from: "Discovery", to: "Harvester", isBlocked: false },
    { from: "Harvester", to: "Redesign", isBlocked: false }
  ],
  nextSteps: ["Unblock Redesign stage", "Continue with Outreach"],
  estimatedTimeToComplete: 172800
}
```

**Purpose:** Orchestrate pipeline stages and track progress

---

### 2. `session-boundary-manager`

**Input:**
```javascript
{
  transcript: [
    "Agent started Discovery phase",
    "Discovery phase completed with 50 findings",
    "Harvester phase started",
    "Processing harvested data...",
    "Redesign phase initiated",
    "Awaiting design approval..."
  ]
}
```

**Output:**
```javascript
{
  messageCount: 6,
  contextDriftScore: 0.3,
  isOverflowing: false,
  recommendations: [
    "Context is within limits",
    "No drift detected"
  ],
  suggestedAction: "continue"
}
```

**Purpose:** Monitor context overflow and drift

---

### 3. `helm-daily-brief`

**Input:**
```javascript
{
  repoActivity: [
    { timestamp: "2026-06-05T08:00:00Z", event: "commit", message: "Deploy redesign v2" },
    { timestamp: "2026-06-05T12:30:00Z", event: "pr_closed", message: "Merge design review PR" }
  ],
  agentActivity: [
    { timestamp: "2026-06-05T08:15:00Z", agentName: "Agent-A", action: "design_review", status: "complete" },
    { timestamp: "2026-06-05T14:00:00Z", agentName: "Agent-C", action: "outreach_prep", status: "in-progress" }
  ],
  roadmap: { /* current roadmap */ }
}
```

**Output:**
```javascript
{
  reportDate: "2026-06-05",
  reportPeriod: "2026-06-04 to 2026-06-05",
  executiveSummary: "Pipeline progressing through Redesign phase. One blocker: awaiting design approval.",
  pipelineStatus: {
    stage: "Redesign",
    blockers: 1,
    progressPercent: 40
  },
  recentActivity: [
    "Design review completed and merged",
    "Outreach prep initiated",
    "2 commits landed"
  ],
  agentPerformance: [
    { agentName: "Agent-A", tasksCompleted: 3, tasksBlocked: 0, successRate: 1.0 },
    { agentName: "Agent-C", tasksCompleted: 2, tasksBlocked: 1, successRate: 0.67 }
  ],
  keyDecisions: ["Merged redesign v2", "Started outreach prep"],
  recommendations: ["Escalate design approval", "Continue outreach in parallel"]
}
```

**Purpose:** Generate daily operations brief

---

### 4. `idea-inbox-harvester`

**Input:**
```javascript
{
  ideas: [
    { id: "idea-001", idea: "Add real-time collaboration", source: "feedback" },
    { id: "idea-002", idea: "Support offline mode", source: "user-request" },
    { id: "idea-003", idea: "Improve search performance", source: "team-discussion" }
  ]
}
```

**Output:**
```javascript
{
  ideasProcessed: 3,
  ideasAccepted: 2,
  ideasRejected: 0,
  ideasNeedingReview: 1,
  structured: [
    {
      id: "idea-001",
      idea: "Add real-time collaboration",
      source: "feedback",
      category: "feature",
      priority: "high",
      phaseTarget: "phase-45.0",
      recommendation: "Schedule for Phase 45"
    },
    {
      id: "idea-002",
      idea: "Support offline mode",
      source: "user-request",
      category: "feature",
      priority: "medium",
      phaseTarget: "phase-46.0",
      recommendation: "Backlog for Phase 46"
    }
  ]
}
```

**Purpose:** Structure and categorize ideas for roadmap

---

### 5. `operator-grade-procedures` (optional)

**Input:**
```javascript
{
  task: "Resolve pipeline blockers and continue to Outreach",
  environment: {
    currentStage: "Redesign",
    blockedStages: ["Redesign"],
    blockers: ["Waiting for design approval"],
    ideaCount: 3
  }
}
```

**Output:**
```javascript
{
  procedureId: "pipeline-blocker-resolution",
  title: "Resolve Redesign Blocker and Continue Pipeline",
  blockerCount: 1,
  steps: [
    {
      step: 1,
      action: "Follow up on design approval with stakeholders",
      targetBlocker: "Waiting for design approval",
      validation: "Approval received or decision made",
      estimatedTimeSeconds: 900
    },
    {
      step: 2,
      action: "If approved: merge redesign and proceed to Outreach",
      targetBlocker: "Design approval",
      validation: "Redesign merged into main",
      estimatedTimeSeconds: 300
    },
    {
      step: 3,
      action: "Start Outreach phase with Agent-D",
      targetBlocker: "Pipeline continuation",
      validation: "Outreach phase initiated",
      estimatedTimeSeconds: 600
    }
  ],
  validationChecks: [
    "Design approval obtained",
    "No merge conflicts",
    "Outreach phase can start independently"
  ],
  errorBranches: [
    {
      condition: "Design approval rejected",
      fallback: "Return to Redesign phase, address feedback"
    }
  ],
  estimatedDuration: 1800,
  riskLevel: "medium"
}
```

**Purpose:** Generate procedures to unblock pipeline

---

## Error Model

### Validation Errors (400-equivalent)

```javascript
{
  error: true,
  type: "validation",
  validation: {
    field: "pipelineState.stages",
    message: "pipelineState.stages must be a non-empty array"
  },
  timestamp: "2026-06-05T14:35:00Z",
  durationMs: 5
}
```

---

### Skill Errors (500-equivalent)

```javascript
{
  error: true,
  type: "skill",
  skill: {
    skillName: "helm-daily-brief",
    skillError: "Invalid activity format: missing timestamp",
    metadata: {
      activityCount: 10,
      firstInvalidIndex: 3
    }
  },
  timestamp: "2026-06-05T14:35:00Z",
  durationMs: 1245
}
```

---

### Partial Errors (207-equivalent)

```javascript
{
  error: true,
  type: "partial",
  partial: {
    completed: ["rewrite-labs-orchestrator", "session-boundary-manager", "helm-daily-brief"],
    failed: ["idea-inbox-harvester"]
  },
  timestamp: "2026-06-05T14:35:00Z",
  durationMs: 4123
}
```

---

## Telemetry

### Recorded Metrics

```typescript
interface PipelineWorkflowTelemetry {
  workflowId: "pipeline-orchestration-dashboard";
  invocationId: string;
  timestamp: string;
  
  // Execution
  totalDurationMs: number;
  skillDurations: {
    "rewrite-labs-orchestrator": number;
    "session-boundary-manager": number;
    "helm-daily-brief": number;
    "idea-inbox-harvester": number;
    "operator-grade-procedures": number;
  };
  
  // Pipeline
  totalStages: number;
  completedStages: number;
  blockedStages: number;
  progressPercent: number;
  
  // Activity
  repoActivityCount: number;
  agentActivityCount: number;
  
  // Ideas
  ideasProcessed: number;
  ideasAccepted: number;
  
  // Context
  contextDriftScore: number;
  isContextOverflowing: boolean;
  
  // Operations
  blockersIdentified: number;
  procedureStepsGenerated: number;
  
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
  workflowId: "pipeline-orchestration-dashboard",
  invocationId: "inv-i9j0k1l2",
  timestamp: "2026-06-05T14:35:00Z",
  totalDurationMs: 5234,
  skillDurations: {
    "rewrite-labs-orchestrator": 456,
    "session-boundary-manager": 234,
    "helm-daily-brief": 789,
    "idea-inbox-harvester": 567,
    "operator-grade-procedures": 623
  },
  totalStages: 5,
  completedStages: 2,
  blockedStages: 1,
  progressPercent: 40,
  repoActivityCount: 12,
  agentActivityCount: 15,
  ideasProcessed: 3,
  ideasAccepted: 2,
  contextDriftScore: 0.3,
  isContextOverflowing: false,
  blockersIdentified: 1,
  procedureStepsGenerated: 3,
  errors: []
}
```

---

## Context Usage

### Writes

**After successful orchestration:**

```javascript
runtime.setContext("pipeline", "currentStage", "Redesign", 3600000);  // 1h TTL
runtime.setContext("pipeline", "blockers", orchestration.blockers, 1800000);  // 30m TTL
runtime.setContext("pipeline", "dailyBrief", dailyBrief, 86400000);  // 24h TTL
runtime.setContext("pipeline", "harvestedIdeas", harvestedIdeas, 604800000);  // 7d TTL
```

### Reads

**Before starting workflow:**

```javascript
const currentStage = runtime.getContext("pipeline").currentStage;
const previousBlockers = runtime.getContext("pipeline").blockers;
const lastBrief = runtime.getContext("pipeline").dailyBrief;

// Use for trend analysis or blocker comparison
```

---

## Example Invocation

### From Claude Code

```
Generate a pipeline status dashboard and brief for today.

Pipeline stages: Discovery, Harvester, Redesign, Outreach, Delivery
Current: Redesign (blocked)
Recent activity: 12 commits, 3 agents active
New ideas: 3 in inbox
```

### Programmatic

```javascript
import { runtime } from "../../skills-runtime/index.js";

const result = await runtime.invokeSkill("pipeline-orchestration-dashboard", {
  pipelineState: {
    stages: ["Discovery", "Harvester", "Redesign", "Outreach", "Delivery"],
    current: "Redesign",
    status: "blocked"
  },
  repoActivity: activityData,
  agentActivity: agentData,
  ideaInbox: ideasData,
  generateProcedure: true,
  harvestIdeas: true,
  timeWindowDays: 1
});
```

---

## Example Output

```json
{
  "orchestration": {
    "totalStages": 5,
    "completedStages": 2,
    "blockedStages": 1,
    "progressPercent": 40,
    "stageStatus": [
      {
        "stage": "Discovery",
        "status": "complete",
        "progress": 100,
        "blockers": [],
        "owner": "Agent-A"
      },
      {
        "stage": "Harvester",
        "status": "complete",
        "progress": 100,
        "blockers": [],
        "owner": "Agent-B"
      },
      {
        "stage": "Redesign",
        "status": "blocked",
        "progress": 60,
        "blockers": ["Awaiting design approval from stakeholders"],
        "owner": "Agent-C"
      },
      {
        "stage": "Outreach",
        "status": "not-started",
        "progress": 0,
        "blockers": ["Blocked by Redesign completion"],
        "owner": null
      },
      {
        "stage": "Delivery",
        "status": "not-started",
        "progress": 0,
        "blockers": ["Blocked by Outreach"],
        "owner": null
      }
    ],
    "dependencies": [
      { "from": "Discovery", "to": "Harvester", "isBlocked": false },
      { "from": "Harvester", "to": "Redesign", "isBlocked": false },
      { "from": "Redesign", "to": "Outreach", "isBlocked": true },
      { "from": "Outreach", "to": "Delivery", "isBlocked": true }
    ],
    "nextSteps": [
      "Resolve Redesign blocker (design approval)",
      "Prepare Outreach stage",
      "Continue Delivery pipeline"
    ],
    "estimatedTimeToComplete": 259200
  },
  "sessionBoundary": {
    "messageCount": 35,
    "contextDriftScore": 0.25,
    "isOverflowing": false,
    "recommendations": [
      "Context is healthy",
      "No summarization needed"
    ],
    "suggestedAction": "continue"
  },
  "dailyBrief": {
    "reportDate": "2026-06-05",
    "reportPeriod": "2026-06-04 to 2026-06-05",
    "executiveSummary": "Pipeline in progress at 40% completion. Redesign stage blocked by design approval. 3 new ideas in inbox. All agents performing well.",
    "pipelineStatus": {
      "stage": "Redesign",
      "blockers": 1,
      "progressPercent": 40
    },
    "recentActivity": [
      "Agent-A completed discovery with 47 findings",
      "Agent-B harvested 23 insights",
      "Agent-C redesigned 6 components",
      "12 commits landed",
      "3 pull requests merged"
    ],
    "agentPerformance": [
      {
        "agentName": "Agent-A",
        "tasksCompleted": 8,
        "tasksBlocked": 0,
        "successRate": 1.0
      },
      {
        "agentName": "Agent-B",
        "tasksCompleted": 6,
        "tasksBlocked": 0,
        "successRate": 1.0
      },
      {
        "agentName": "Agent-C",
        "tasksCompleted": 5,
        "tasksBlocked": 1,
        "successRate": 0.83
      }
    ],
    "keyDecisions": [
      "Approved redesign direction",
      "Allocated Agent-D for outreach",
      "Scheduled design review for today at 3pm"
    ],
    "recommendations": [
      "Follow up on design approval by end of day",
      "Prepare Outreach materials in parallel",
      "Schedule blocker resolution sync"
    ]
  },
  "harvestedIdeas": {
    "ideasProcessed": 3,
    "ideasAccepted": 2,
    "ideasRejected": 0,
    "ideasNeedingReview": 1,
    "structured": [
      {
        "id": "idea-001",
        "idea": "Add real-time collaboration features",
        "source": "user-feedback",
        "category": "feature",
        "priority": "high",
        "phaseTarget": "phase-45.0",
        "recommendation": "Schedule for Phase 45 implementation"
      },
      {
        "id": "idea-002",
        "idea": "Improve search latency",
        "source": "performance-analysis",
        "category": "optimization",
        "priority": "medium",
        "phaseTarget": "phase-44.2",
        "recommendation": "Add to Phase 44.2 performance sprint"
      },
      {
        "id": "idea-003",
        "idea": "Support offline mode",
        "source": "user-request",
        "category": "feature",
        "priority": "medium",
        "phaseTarget": "phase-46.0",
        "recommendation": "Backlog for Phase 46, requires architecture review"
      }
    ]
  },
  "procedure": {
    "procedureId": "pipeline-blocker-resolution-20260605",
    "title": "Resolve Redesign Blocker and Continue Pipeline",
    "blockerCount": 1,
    "steps": [
      {
        "step": 1,
        "action": "Contact design stakeholders for approval status",
        "targetBlocker": "Awaiting design approval",
        "validation": "Approval decision received (yes/no/revise)",
        "estimatedTimeSeconds": 900
      },
      {
        "step": 2,
        "action": "If approved: merge redesign PR #142 to main",
        "targetBlocker": "Design approval blocking merge",
        "validation": "PR merged, all checks passed",
        "estimatedTimeSeconds": 300
      },
      {
        "step": 3,
        "action": "Deploy redesign v2 to staging",
        "targetBlocker": "Staging validation",
        "validation": "Staging deployment healthy",
        "estimatedTimeSeconds": 600
      },
      {
        "step": 4,
        "action": "Start Outreach phase with Agent-D",
        "targetBlocker": "Outreach pipeline blockage",
        "validation": "Outreach phase initiated",
        "estimatedTimeSeconds": 300
      }
    ],
    "validationChecks": [
      "Design approval documented",
      "Merge conflicts resolved",
      "Staging tests all passing",
      "Outreach materials ready"
    ],
    "errorBranches": [
      {
        "condition": "Design approval rejected",
        "fallback": "Return to Redesign, document feedback, schedule revision sprint"
      },
      {
        "condition": "Merge fails with conflicts",
        "fallback": "Resolve conflicts manually, run full test suite before merging"
      }
    ],
    "estimatedDuration": 2100,
    "riskLevel": "low"
  },
  "dashboard": {
    "dataPoints": 47,
    "visualizations": [
      {
        "type": "timeline",
        "title": "Pipeline Stage Timeline",
        "data": {
          "stages": ["Discovery", "Harvester", "Redesign", "Outreach", "Delivery"],
          "timings": [14400, 18000, 43200, 0, 0]
        }
      },
      {
        "type": "progress",
        "title": "Overall Pipeline Progress",
        "data": {
          "total": 100,
          "completed": 40,
          "blockers": 1
        }
      },
      {
        "type": "dependency",
        "title": "Stage Dependencies",
        "data": {
          "nodes": [
            { "id": "Discovery", "status": "complete" },
            { "id": "Harvester", "status": "complete" },
            { "id": "Redesign", "status": "blocked" },
            { "id": "Outreach", "status": "blocked" },
            { "id": "Delivery", "status": "blocked" }
          ],
          "edges": [
            { "from": "Discovery", "to": "Harvester" },
            { "from": "Harvester", "to": "Redesign" },
            { "from": "Redesign", "to": "Outreach" },
            { "from": "Outreach", "to": "Delivery" }
          ]
        }
      }
    ]
  },
  "metadata": {
    "workflowDuration": 5234,
    "skillChainUsed": [
      "rewrite-labs-orchestrator",
      "session-boundary-manager",
      "helm-daily-brief",
      "idea-inbox-harvester",
      "operator-grade-procedures"
    ],
    "timestamp": "2026-06-05T14:35:00Z",
    "errors": []
  }
}
```

---

## Notes

- **Idempotency:** Workflow is safe to run multiple times. Context uses TTL.
- **Partial Failure:** If one skill fails, output includes partial results with error flag.
- **Real-Time:** Dashboard data refreshes on each invocation.
- **Timeout:** Default 30s per skill. Total workflow typically 3–8s.
- **Blocker Escalation:** Critical blockers should trigger alerts (Phase 44.3+).

---

**Status:** Ready for implementation (Phase 44.2-A)  
**Next:** Scaffold generation (Phase 44.2-B)

