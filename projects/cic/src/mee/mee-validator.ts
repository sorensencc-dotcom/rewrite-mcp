// File: projects/cic/src/mee/mee-validator.ts | Date: 2026-06-03 | v1.2.0

import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import YAML from "yaml";
import { PhasePatchSet, PhaseValidationReport, ValidationIssue } from "./mee-schema.js";

const execAsync = promisify(exec);

export class MeeValidator {
  validate(patch: PhasePatchSet): PhaseValidationReport {
    return this.validatePatchSet(patch);
  }

  validatePatchSet(patchSet: PhasePatchSet): PhaseValidationReport {
    const errors: string[] = [];
    const issues: ValidationIssue[] = [];

    if (!patchSet.patches || patchSet.patches.length === 0) {
      const msg = "No patches generated in patch set.";
      errors.push(msg);
      issues.push({ type: "empty", message: msg });
    } else {
      const conflictErrors = this.validateFileConflicts(patchSet);
      for (const err of conflictErrors) {
        errors.push(err);
        issues.push({ type: "conflict", message: err });
      }

      const schemaErrors = this.validateSchema(patchSet);
      for (const err of schemaErrors) {
        errors.push(err);
        issues.push({ type: "schema", message: err });
      }
    }

    return {
      passed: errors.length === 0,
      compilePassed: true,
      testsPassed: true,
      driftPassed: true,
      errors,
      issues
    };
  }

  validateFileConflicts(patchSet: PhasePatchSet): string[] {
    const errors: string[] = [];
    const protectedPaths = ["package.json", "tsconfig.json", "projects/cic/src/"];

    for (const patch of patchSet.patches) {
      const fullPath = path.join(process.cwd(), patch.path);
      
      // If it's a create patch and file exists
      if (patch.type === "create" && fs.existsSync(fullPath)) {
        errors.push(`File conflict: ${patch.path} already exists.`);
      }

      // If it tries to modify or overwrite a protected file
      const normalizedPath = patch.path.replace(/\\/g, "/");
      const isProtected = protectedPaths.some(p => 
        normalizedPath === p || normalizedPath.startsWith(p)
      );

      if (isProtected) {
        errors.push(`Security error: modifications to protected path ${patch.path} are forbidden.`);
      }
    }
    return errors;
  }

  validateSchema(patchSet: PhasePatchSet): string[] {
    const errors: string[] = [];
    for (const patch of patchSet.patches) {
      if (patch.path.endsWith(".json")) {
        try {
          JSON.parse(patch.content);
        } catch (err: any) {
          errors.push(`JSON syntax error in ${patch.path}: ${err.message}`);
        }
      } else if (patch.path.endsWith(".yaml") || patch.path.endsWith(".yml")) {
        try {
          YAML.parse(patch.content);
        } catch (err: any) {
          errors.push(`YAML syntax error in ${patch.path}: ${err.message}`);
        }
      }
    }
    return errors;
  }

  async validateBuild(): Promise<{ passed: boolean; error?: string }> {
    if (process.env.NODE_ENV === "test" || process.env.MOCK_VALIDATION === "true") {
      return { passed: true };
    }
    try {
      await execAsync("npm run build --workspace=cic", { timeout: 30000 });
      return { passed: true };
    } catch (err: any) {
      return { passed: false, error: err.message || "Compilation failed." };
    }
  }

  async validateTests(): Promise<{ passed: boolean; error?: string }> {
    if (process.env.NODE_ENV === "test" || process.env.MOCK_VALIDATION === "true") {
      return { passed: true };
    }
    try {
      await execAsync("npm run test --workspace=cic", { timeout: 30000 });
      return { passed: true };
    } catch (err: any) {
      return { passed: false, error: err.message || "Test suite failed." };
    }
  }

  async validateAll(patchSet: PhasePatchSet): Promise<PhaseValidationReport> {
    const patchReport = this.validatePatchSet(patchSet);
    const buildResult = await this.validateBuild();
    const testResult = await this.validateTests();

    const compilePassed = buildResult.passed;
    const testsPassed = testResult.passed;
    
    const errors: string[] = [...patchReport.errors];
    if (buildResult.error) errors.push(`Build Failed: ${buildResult.error}`);
    if (testResult.error) errors.push(`Tests Failed: ${testResult.error}`);

    const issues: ValidationIssue[] = [...(patchReport.issues || [])];
    if (!compilePassed) {
      issues.push({ type: "build", message: buildResult.error || "Compilation check failed." });
    }
    if (!testsPassed) {
      issues.push({ type: "test", message: testResult.error || "Vitest run failed." });
    }

    const passed = patchReport.passed && compilePassed && testsPassed;

    return {
      passed,
      compilePassed,
      testsPassed,
      driftPassed: true,
      errors,
      issues
    };
  }
}
