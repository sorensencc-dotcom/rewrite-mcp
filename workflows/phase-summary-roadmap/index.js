// Workflow: Phase Summary → Roadmap Update
// Chains: cic-section-summarizer → phase-validator → cic-roadmap-updater → operator-grade-procedures

import { runtime } from "../../skills-runtime/index.js";

function validateInputs(input) {
  if (!input.phaseId || typeof input.phaseId !== "string") {
    throw new Error("phaseId is required and must be a string");
  }
  if (!Array.isArray(input.sectionIds) || input.sectionIds.length === 0) {
    throw new Error("sectionIds is required and must be a non-empty array");
  }
  if (!input.roadmap || typeof input.roadmap !== "object") {
    throw new Error("roadmap is required and must be an object");
  }
}

export function runPhaseSummaryWorkflow({
  phaseId,
  sectionIds,
  roadmap,
  artifacts = [],
  tests = [],
  generateProcedure = true
}) {
  validateInputs({ phaseId, sectionIds, roadmap });

  return (async () => {
    const startTime = Date.now();
    const errors = [];

    try {
      // Store current phase in context
      runtime.setContext("phase", "current", phaseId, 3600000);

      // Step 1: Summarize each section
      const sectionSummaries = [];
      for (const sectionId of sectionIds) {
        try {
          const summary = await runtime.invokeSkill(
            "cic-section-summarizer",
            {
              sectionId,
              files: artifacts
            },
            { timeout: 30000, retries: 1 }
          );
          sectionSummaries.push(summary);
        } catch (error) {
          errors.push({
            skill: "cic-section-summarizer",
            message: error.message,
            severity: "error"
          });
        }
      }

      // Calculate aggregate progress
      const totalPercent = sectionSummaries.length > 0
        ? Math.round(
            sectionSummaries.reduce((sum, s) => sum + (s.percentComplete || 0), 0) /
            sectionSummaries.length
          )
        : 0;

      const aggregateStatus =
        totalPercent === 100
          ? "complete"
          : totalPercent === 0
            ? "not-started"
            : sectionSummaries.some((s) => s.status === "blocked")
              ? "blocked"
              : "in-progress";

      const phaseSummary = {
        sections: sectionSummaries,
        totalPercentComplete: totalPercent,
        aggregateStatus
      };

      // Store summary in context
      runtime.setContext("phase", "lastSummary", phaseSummary, 7200000);

      // Step 2: Validate phase
      let validationReport = null;
      try {
        validationReport = await runtime.invokeSkill(
          "phase-validator",
          {
            phaseSpec: { name: phaseId, sections: sectionIds },
            artifacts,
            tests
          },
          { timeout: 30000, retries: 1 }
        );
      } catch (error) {
        errors.push({
          skill: "phase-validator",
          message: error.message,
          severity: "warning"
        });
        validationReport = {
          phaseId,
          isValid: false,
          missingArtifacts: artifacts,
          missingTests: tests,
          testCoverage: 0,
          recommendations: [error.message]
        };
      }

      // Step 3: Update roadmap
      let roadmapUpdate = null;
      try {
        roadmapUpdate = await runtime.invokeSkill(
          "cic-roadmap-updater",
          {
            roadmap,
            progress: {
              phaseId,
              percentComplete: totalPercent,
              sectionSummaries
            }
          },
          { timeout: 30000, retries: 1 }
        );

        // Store roadmap version in context
        if (roadmapUpdate.suggestedVersion) {
          runtime.setContext(
            "roadmap",
            "lastVersion",
            roadmapUpdate.suggestedVersion,
            86400000
          );
        }
      } catch (error) {
        errors.push({
          skill: "cic-roadmap-updater",
          message: error.message,
          severity: "error"
        });
        roadmapUpdate = {
          phaseId,
          percentComplete: totalPercent,
          suggestedVersion: "unknown",
          newEntries: [],
          recommendation: error.message
        };
      }

      // Step 4: Generate procedures (optional)
      let procedure = null;
      if (generateProcedure) {
        try {
          procedure = await runtime.invokeSkill(
            "operator-grade-procedures",
            {
              task: `Complete phase ${phaseId} and transition to next phase`,
              environment: {
                currentPhase: phaseId,
                progressPercent: totalPercent,
                blockers: phaseSummary.sections
                  .filter((s) => s.status === "blocked")
                  .map((s) => `${s.sectionId}: ${s.blockers.join(", ")}`)
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

      const duration = Date.now() - startTime;

      return {
        phaseId,
        phaseSummary,
        validationReport,
        roadmapUpdate,
        procedure,
        metadata: {
          workflowDuration: duration,
          skillChainUsed: [
            "cic-section-summarizer",
            "phase-validator",
            "cic-roadmap-updater",
            generateProcedure ? "operator-grade-procedures" : null
          ].filter(Boolean),
          timestamp: new Date().toISOString(),
          errors
        }
      };
    } catch (error) {
      throw new Error(`Phase summary workflow failed: ${error.message}`);
    }
  })();
}
