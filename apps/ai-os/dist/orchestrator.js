"use strict";
// orchestrator.ts - AI-OS Export Pipeline Orchestrator
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPipeline = runPipeline;
const path = __importStar(require("node:path"));
const drift_js_1 = require("./drift.js");
const normalize_js_1 = require("./normalize.js");
const merge_js_1 = require("./merge.js");
const version_js_1 = require("./version.js");
const docs_sync_js_1 = require("./docs_sync.js");
const validate_js_1 = require("./validate.js"); // New import
const diff_js_1 = require("./diff.js"); // New import
// Placeholder for generate, as it was not specified to be a separate module yet.
async function generate(root) { console.log("Generating AI-OS..."); }
async function runPipeline(root) {
    console.log("Starting AI-OS Export Pipeline...");
    const aiOsRoot = path.join(root, "ai-os");
    const aiOsPrevRoot = path.join(root, "ai-os-prev");
    // 1. generate
    await generate(aiOsRoot);
    // 2. normalize
    await (0, normalize_js_1.normalize)(aiOsRoot);
    // 3. merge
    await (0, merge_js_1.merge)(aiOsRoot);
    // 4. validate (New step)
    console.log("Validating AI-OS export...");
    const isValid = await (0, validate_js_1.validateAIOS)(aiOsRoot);
    if (!isValid) {
        console.error("AI-OS Validation failed. Halting pipeline.");
        return; // Stop the pipeline
    }
    console.log("AI-OS Validation passed.");
    // 5. version
    await (0, version_js_1.version)(aiOsRoot);
    // 6. docs
    await (0, docs_sync_js_1.syncDocs)(aiOsRoot);
    // 7. drift
    await (0, drift_js_1.detectDrift)(aiOsRoot, aiOsPrevRoot);
    // 8. diff (New step)
    await (0, diff_js_1.generateDiff)(aiOsRoot, aiOsPrevRoot);
    console.log("AI-OS Export Pipeline completed.");
}
// Example usage (for testing or manual execution)
// runPipeline(process.cwd()).catch(console.error);
