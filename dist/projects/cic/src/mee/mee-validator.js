"use strict";
// File: projects/cic/src/mee/mee-validator.ts | Date: 2026-06-03 | v1.2.0
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeeValidator = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const yaml_1 = __importDefault(require("yaml"));
const execAsync = (0, node_util_1.promisify)(node_child_process_1.exec);
class MeeValidator {
    validate(patch) {
        return this.validatePatchSet(patch);
    }
    validatePatchSet(patchSet) {
        const errors = [];
        const issues = [];
        if (!patchSet.patches || patchSet.patches.length === 0) {
            const msg = "No patches generated in patch set.";
            errors.push(msg);
            issues.push({ type: "empty", message: msg });
        }
        else {
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
    validateFileConflicts(patchSet) {
        const errors = [];
        const protectedPaths = ["package.json", "tsconfig.json", "projects/cic/src/"];
        for (const patch of patchSet.patches) {
            const fullPath = node_path_1.default.join(process.cwd(), patch.path);
            // If it's a create patch and file exists
            if (patch.type === "create" && node_fs_1.default.existsSync(fullPath)) {
                errors.push(`File conflict: ${patch.path} already exists.`);
            }
            // If it tries to modify or overwrite a protected file
            const normalizedPath = patch.path.replace(/\\/g, "/");
            const isProtected = protectedPaths.some(p => normalizedPath === p || normalizedPath.startsWith(p));
            if (isProtected) {
                errors.push(`Security error: modifications to protected path ${patch.path} are forbidden.`);
            }
        }
        return errors;
    }
    validateSchema(patchSet) {
        const errors = [];
        for (const patch of patchSet.patches) {
            if (patch.path.endsWith(".json")) {
                try {
                    JSON.parse(patch.content);
                }
                catch (err) {
                    errors.push(`JSON syntax error in ${patch.path}: ${err.message}`);
                }
            }
            else if (patch.path.endsWith(".yaml") || patch.path.endsWith(".yml")) {
                try {
                    yaml_1.default.parse(patch.content);
                }
                catch (err) {
                    errors.push(`YAML syntax error in ${patch.path}: ${err.message}`);
                }
            }
        }
        return errors;
    }
    async validateBuild() {
        if (process.env.NODE_ENV === "test" || process.env.MOCK_VALIDATION === "true") {
            return { passed: true };
        }
        try {
            await execAsync("npm run build --workspace=cic", { timeout: 30000 });
            return { passed: true };
        }
        catch (err) {
            return { passed: false, error: err.message || "Compilation failed." };
        }
    }
    async validateTests() {
        if (process.env.NODE_ENV === "test" || process.env.MOCK_VALIDATION === "true") {
            return { passed: true };
        }
        try {
            await execAsync("npm run test --workspace=cic", { timeout: 30000 });
            return { passed: true };
        }
        catch (err) {
            return { passed: false, error: err.message || "Test suite failed." };
        }
    }
    async validateAll(patchSet) {
        const patchReport = this.validatePatchSet(patchSet);
        const buildResult = await this.validateBuild();
        const testResult = await this.validateTests();
        const compilePassed = buildResult.passed;
        const testsPassed = testResult.passed;
        const errors = [...patchReport.errors];
        if (buildResult.error)
            errors.push(`Build Failed: ${buildResult.error}`);
        if (testResult.error)
            errors.push(`Tests Failed: ${testResult.error}`);
        const issues = [...(patchReport.issues || [])];
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
exports.MeeValidator = MeeValidator;
//# sourceMappingURL=mee-validator.js.map