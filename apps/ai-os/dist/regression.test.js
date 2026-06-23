"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const merge_js_1 = require("./merge.js");
const validate_js_1 = require("./validate.js");
async function runRegression() {
    console.log("Starting AI-OS Regression Test...");
    const testRoot = node_path_1.default.join(process.cwd(), "test-ai-os-root");
    try {
        // Cleanup
        await node_fs_1.promises.rm(testRoot, { recursive: true, force: true });
        await node_fs_1.promises.mkdir(testRoot, { recursive: true });
        // 1. Run Merge
        console.log("Step 1: Running Merge...");
        await (0, merge_js_1.merge)(testRoot);
        // 2. Verify file existence
        console.log("Step 2: Verifying files...");
        const modelPath = node_path_1.default.join(testRoot, "SYSTEM", "execution_model.md");
        await node_fs_1.promises.access(modelPath);
        console.log("✅ execution_model.md created");
        const content = await node_fs_1.promises.readFile(modelPath, "utf8");
        const requiredSections = [
            "## Purpose",
            "## Execution Modes",
            "## Task Lifecycle",
            "## Agent Selection Logic",
            "## Parallel Execution Rules",
            "## Memory Access Model",
            "## State Propagation",
            "## Failure Handling",
            "## Timeout Policy",
            "## Deterministic Ordering",
            "## Logging Requirements"
        ];
        for (const section of requiredSections) {
            if (!content.includes(section)) {
                throw new Error(`Missing section in execution_model.md: ${section}`);
            }
        }
        console.log("✅ execution_model.md contains all required sections");
        // 3. Run Validation
        console.log("Step 3: Running Validation...");
        // We expect validation to FAIL on missing categories/version, but we want to check if it finds execution_model.md
        // To make it pass enough to check our part, let's fake some files or just check the report
        const report = await (0, validate_js_1.validateAIOS)(testRoot);
        const reportPath = node_path_1.default.join(testRoot, "VALIDATION", "report.json");
        const reportData = JSON.parse(await node_fs_1.promises.readFile(reportPath, "utf8"));
        const modelError = reportData.errors.find((e) => e.includes("execution_model.md"));
        if (modelError) {
            throw new Error(`Validation failed for execution_model.md: ${modelError}`);
        }
        console.log("✅ validation_report does NOT contain errors for execution_model.md");
        console.log("\nREGRESSION TEST PASSED!");
    }
    catch (error) {
        console.error("\nREGRESSION TEST FAILED!");
        console.error(error);
        process.exit(1);
    }
    finally {
        // Cleanup
        // await fs.rm(testRoot, { recursive: true, force: true });
    }
}
runRegression();
