// Workflow: Pipeline Orchestration → Status Dashboard
// Chains: rewrite-labs-orchestrator → session-boundary-manager → helm-daily-brief → idea-inbox-harvester → operator-grade-procedures

import { runtime } from "../../skills-runtime/index.js";

function validateInputs(input) {
  if (!input.pipelineState || typeof input.pipelineState !== "object") {
    throw new Error("pipelineState is required and must be an object");
  }
  if (!Array.isArray(input.pipelineState.stages)) {
    throw new Error("pipelineState.stages must be an array");
  }
  if (!input.pipelineState.current || typeof input.pipelineState.current !== "string") {
    throw new Error("pipelineState.current is required");
  }
  if (!Array.isArray(input.repoActivity)) {
    throw new Error("repoActivity must be an array");
  }
  if (!Array.isArray(input.agentActivity)) {
    throw new Error("agentActivity must be an array");
  }
  if (!Array.isArray(input.ideaInbox)) {
    throw new Error("ideaInbox must be an array");
  }
}

export function runPipelineWorkflow({
  pipelineState,
  repoActivity,
  agentActivity,
  ideaInbox,
  roadmap = {},
  generateProcedure = true,
  harvestIdeas = true
}) {
  validateInputs({ pipelineState, repoActivity, agentActivity, ideaInbox });

  return (async () => {
    const startTime = Date.now();
    const errors = [];

    try {
      // Store pipeline state in context
      runtime.setContext("pipeline", "currentState", pipelineState, 3600000);

      // Step 1: Orchestrate pipeline
      let orchestration = null;
      try {
        orchestration = await runtime.invokeSkill(
          "rewrite-labs-orchestrator",
          { pipelineState },
          { timeout: 30000, retries: 1 }
        );
      } catch (error) {
        errors.push({
          skill: "rewrite-labs-orchestrator",
          message: error.message,
          severity: "error"
        });
        orchestration = {
          totalStages: pipelineState.stages.length,
          completedStages: 0,
          blockedStages: 0,
          progressPercent: 0,
          stageStatus: [],
          dependencies: [],
          nextSteps: [error.message],
          estimatedTimeToComplete: 0
        };
      }

      // Step 2: Check session boundary
      let sessionBoundary = null;
      try {
        const transcript = [
          ...repoActivity.map((a) => a.message || ""),
          ...agentActivity.map((a) => a.action || "")
        ].filter(Boolean);

        sessionBoundary = await runtime.invokeSkill(
          "session-boundary-manager",
          { transcript },
          { timeout: 30000, retries: 1 }
        );
      } catch (error) {
        errors.push({
          skill: "session-boundary-manager",
          message: error.message,
          severity: "warning"
        });
        sessionBoundary = {
          messageCount: repoActivity.length + agentActivity.length,
          contextDriftScore: 0,
          isOverflowing: false,
          recommendations: [],
          suggestedAction: "continue"
        };
      }

      // Step 3: Generate daily brief
      let dailyBrief = null;
      try {
        dailyBrief = await runtime.invokeSkill(
          "helm-daily-brief",
          {
            repoActivity,
            agentActivity,
            roadmap
          },
          { timeout: 30000, retries: 1 }
        );

        runtime.setContext("pipeline", "lastBrief", dailyBrief, 86400000);
      } catch (error) {
        errors.push({
          skill: "helm-daily-brief",
          message: error.message,
          severity: "warning"
        });
        dailyBrief = {
          reportDate: new Date().toISOString().split("T")[0],
          reportPeriod: "unknown",
          executiveSummary: error.message,
          pipelineStatus: { stage: pipelineState.current, blockers: 0, progressPercent: 0 },
          recentActivity: [],
          agentPerformance: [],
          keyDecisions: [],
          recommendations: []
        };
      }

      // Step 4: Harvest ideas (optional)
      let harvestedIdeas = null;
      if (harvestIdeas) {
        try {
          harvestedIdeas = await runtime.invokeSkill(
            "idea-inbox-harvester",
            { ideas: ideaInbox },
            { timeout: 30000, retries: 1 }
          );

          runtime.setContext("pipeline", "harvestedIdeas", harvestedIdeas, 604800000);
        } catch (error) {
          errors.push({
            skill: "idea-inbox-harvester",
            message: error.message,
            severity: "warning"
          });
          harvestedIdeas = {
            ideasProcessed: ideaInbox.length,
            ideasAccepted: 0,
            ideasRejected: 0,
            ideasNeedingReview: ideaInbox.length,
            structured: []
          };
        }
      }

      // Step 5: Generate procedures (optional)
      let procedure = null;
      if (generateProcedure && orchestration.blockedStages > 0) {
        try {
          const blockers = orchestration.stageStatus
            ?.filter((s) => s.status === "blocked")
            .map((s) => `${s.stage}: ${s.blockers?.join(", ") || "unknown"}`)
            || [];

          procedure = await runtime.invokeSkill(
            "operator-grade-procedures",
            {
              task: "Resolve pipeline blockers and continue",
              environment: {
                currentStage: pipelineState.current,
                blockedStages: orchestration.blockedStages,
                blockers,
                ideaCount: ideaInbox.length
              }
            },
            { timeout: 30000, retries: 1 }
          );
        } catch (error) {
          errors.push({
            skill: "operator-grade-procedures",
            message: error.message,
            severity: "warning"
          });
        }
      }

      // Build dashboard visualization
      const dashboard = {
        dataPoints: repoActivity.length + agentActivity.length + ideaInbox.length,
        visualizations: [
          {
            type: "timeline",
            title: "Pipeline Stage Timeline",
            data: {
              stages: pipelineState.stages,
              timings: pipelineState.stages.map(() => 0)
            }
          },
          {
            type: "progress",
            title: "Overall Pipeline Progress",
            data: {
              total: 100,
              completed: orchestration?.progressPercent || 0,
              blockers: orchestration?.blockedStages || 0
            }
          },
          {
            type: "dependency",
            title: "Stage Dependencies",
            data: {
              nodes: pipelineState.stages.map((s) => ({
                id: s,
                status: s === pipelineState.current ? "in-progress" : "pending"
              })),
              edges: pipelineState.stages.slice(0, -1).map((s, i) => ({
                from: s,
                to: pipelineState.stages[i + 1]
              }))
            }
          }
        ]
      };

      const duration = Date.now() - startTime;

      return {
        orchestration,
        sessionBoundary,
        dailyBrief,
        harvestedIdeas,
        procedure,
        dashboard,
        metadata: {
          workflowDuration: duration,
          skillChainUsed: [
            "rewrite-labs-orchestrator",
            "session-boundary-manager",
            "helm-daily-brief",
            harvestIdeas ? "idea-inbox-harvester" : null,
            generateProcedure && orchestration?.blockedStages > 0
              ? "operator-grade-procedures"
              : null
          ].filter(Boolean),
          timestamp: new Date().toISOString(),
          errors
        }
      };
    } catch (error) {
      throw new Error(`Pipeline workflow failed: ${error.message}`);
    }
  })();
}
