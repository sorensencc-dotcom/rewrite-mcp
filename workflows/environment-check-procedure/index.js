// Workflow: Environment Check → Procedure Generation
// Chains: environment-validator → environment-diagnostics → operator-grade-procedures → runtime-time-estimator

import { runtime } from "../../skills-runtime/index.js";

function validateInputs(input) {
  if (!input.envConfig || typeof input.envConfig !== "object") {
    throw new Error("envConfig is required and must be an object");
  }
  if (!input.envConfig.os || typeof input.envConfig.os !== "string") {
    throw new Error("envConfig.os is required");
  }
  if (!input.envConfig.nodeVersion || typeof input.envConfig.nodeVersion !== "string") {
    throw new Error("envConfig.nodeVersion is required");
  }
  if (!Array.isArray(input.logs)) {
    throw new Error("logs is required and must be an array");
  }
}

export function runEnvironmentWorkflow({
  envConfig,
  logs,
  generateProcedure = true,
  generateRuntimeEstimate = true
}) {
  validateInputs({ envConfig, logs });

  return (async () => {
    const startTime = Date.now();
    const errors = [];

    try {
      // Store environment check in context
      runtime.setContext("environment", "checkInProgress", true, 600000);

      // Step 1: Validate environment
      let envValidation = null;
      try {
        envValidation = await runtime.invokeSkill(
          "environment-validator",
          {
            os: envConfig.os,
            nodeVersion: envConfig.nodeVersion,
            wslVersion: envConfig.wslVersion,
            pythonVersion: envConfig.pythonVersion,
            mcpStatus: envConfig.mcpStatus
          },
          { timeout: 30000, retries: 1 }
        );
      } catch (error) {
        errors.push({
          skill: "environment-validator",
          message: error.message,
          severity: "error"
        });
        envValidation = {
          os: envConfig.os,
          nodeVersion: envConfig.nodeVersion,
          status: "broken",
          isCompatible: false,
          issues: [{ component: "validation", severity: "error", message: error.message }],
          recommendations: ["Review error and retry"]
        };
      }

      // Step 2: Diagnose issues
      let envDiagnostics = null;
      try {
        envDiagnostics = await runtime.invokeSkill(
          "environment-diagnostics",
          {
            logs,
            systemInfo: {
              os: envConfig.os,
              nodeVersion: envConfig.nodeVersion,
              wslVersion: envConfig.wslVersion,
              pythonVersion: envConfig.pythonVersion
            }
          },
          { timeout: 30000, retries: 1 }
        );
      } catch (error) {
        errors.push({
          skill: "environment-diagnostics",
          message: error.message,
          severity: "warning"
        });
        envDiagnostics = {
          issuesFound: logs.length > 0 ? 1 : 0,
          issues: logs.length > 0 ? [{ pattern: "unknown", rootCause: error.message, affectedComponent: "unknown" }] : [],
          rootCauses: [error.message],
          fixes: ["Review diagnostics and retry"],
          overallHealth: logs.length > 0 ? "degraded" : "healthy"
        };
      }

      // Store environment check result
      runtime.setContext("environment", "lastCheck", envValidation, 3600000);
      runtime.setContext("environment", "issues", envDiagnostics.issues, 1800000);

      // Step 3: Generate procedures (optional)
      let procedure = null;
      if (generateProcedure) {
        try {
          procedure = await runtime.invokeSkill(
            "operator-grade-procedures",
            {
              task: "Fix environment issues and set up development environment",
              environment: {
                os: envConfig.os,
                nodeVersion: envConfig.nodeVersion,
                status: envValidation.status,
                issues: envDiagnostics.issues.slice(0, 3).map((i) => i.rootCause)
              }
            },
            { timeout: 30000, retries: 1 }
          );

          runtime.setContext("environment", "lastProcedure", procedure, 7200000);
        } catch (error) {
          errors.push({
            skill: "operator-grade-procedures",
            message: error.message,
            severity: "warning"
          });
        }
      }

      // Step 4: Estimate runtime (optional)
      let runtimeEstimate = null;
      if (generateRuntimeEstimate && procedure) {
        try {
          runtimeEstimate = await runtime.invokeSkill(
            "runtime-time-estimator",
            {
              tokens: 5000,
              calls: (procedure.steps || []).length,
              parallelism: 1,
              modelThroughput: 200,
              baseLatency: 300,
              sandboxOverhead: 50,
              validationOverhead: 10
            },
            { timeout: 30000, retries: 1 }
          );
        } catch (error) {
          errors.push({
            skill: "runtime-time-estimator",
            message: error.message,
            severity: "warning"
          });
        }
      }

      const duration = Date.now() - startTime;

      return {
        envValidation,
        envDiagnostics,
        procedure,
        runtimeEstimate,
        metadata: {
          workflowDuration: duration,
          skillChainUsed: [
            "environment-validator",
            "environment-diagnostics",
            generateProcedure ? "operator-grade-procedures" : null,
            generateRuntimeEstimate && runtimeEstimate ? "runtime-time-estimator" : null
          ].filter(Boolean),
          timestamp: new Date().toISOString(),
          errors
        }
      };
    } catch (error) {
      throw new Error(`Environment workflow failed: ${error.message}`);
    }
  })();
}
