"use strict";
// validate.ts — v0.1.0 — 2026-05-24
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAIOS = validateAIOS;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
async function validateAIOS(root) {
    const reportDir = node_path_1.default.join(root, "VALIDATION");
    await node_fs_1.promises.mkdir(reportDir, { recursive: true });
    const reportFile = node_path_1.default.join(reportDir, "report.json");
    const errors = [];
    const warnings = [];
    const categories = [
        "SYSTEM",
        "MEMORY",
        "RULES",
        "SKILLS",
        "AGENTS",
        "HOOKS",
        "PLUGINS",
        "CONNECTORS",
        "WORKFLOWS",
        "PROMPTS",
        "CAPABILITIES",
        "LIMITATIONS",
        "TOOLCHAIN"
    ];
    // 1. Category completeness
    for (const category of categories) {
        const dir = node_path_1.default.join(root, category);
        try {
            await node_fs_1.promises.access(dir);
        }
        catch {
            errors.push(`Missing category directory: ${category}`);
        }
    }
    // 2. Platform completeness
    const platforms = ["claude", "copilot", "gemini"];
    for (const category of categories) {
        if (category === "MEMORY")
            continue;
        for (const platform of platforms) {
            const file = node_path_1.default.join(root, category, `${platform}_${category.toLowerCase()}.md`);
            try {
                await node_fs_1.promises.access(file);
            }
            catch {
                warnings.push(`Missing platform file: ${file}`);
            }
        }
    }
    // 3. MEMORY completeness
    try {
        await node_fs_1.promises.access(node_path_1.default.join(root, "MEMORY", "unified_memory.md"));
    }
    catch {
        errors.push("Missing MEMORY/unified_memory.md");
    }
    // 4. Empty file check
    for (const category of categories) {
        const dir = node_path_1.default.join(root, category);
        let entries = [];
        try {
            entries = await node_fs_1.promises.readdir(dir);
        }
        catch {
            continue;
        }
        for (const entry of entries) {
            const full = node_path_1.default.join(dir, entry);
            try {
                const stat = await node_fs_1.promises.stat(full);
                if (stat.isFile()) {
                    if (stat.size === 0) {
                        errors.push(`Empty file: ${full}`);
                    }
                    else if (stat.size < 10) {
                        warnings.push(`Suspiciously small file: ${full}`);
                    }
                }
            }
            catch { }
        }
    }
    // 5. Semver check
    try {
        const version = (await node_fs_1.promises.readFile(node_path_1.default.join(root, "VERSION"), "utf8")).trim();
        if (!/^\d+\.\d+\.\d+$/.test(version)) {
            errors.push(`Invalid semver in VERSION: ${version}`);
        }
    }
    catch {
        errors.push("Missing VERSION file");
    }
    // 6. HISTORY check
    try {
        const history = await node_fs_1.promises.readFile(node_path_1.default.join(root, "HISTORY.md"), "utf8");
        if (!history.includes("## v")) {
            warnings.push("HISTORY.md contains no version entries");
        }
    }
    catch {
        warnings.push("Missing HISTORY.md");
    }
    // 7. TOOLCHAIN completeness
    const toolchainFiles = [
        "toolchain_overview.md",
        "ci_cd.md",
        "build_and_release.md",
        "git_hooks.md"
    ];
    for (const file of toolchainFiles) {
        try {
            await node_fs_1.promises.access(node_path_1.default.join(root, "TOOLCHAIN", file));
        }
        catch {
            warnings.push(`Missing TOOLCHAIN file: ${file}`);
        }
    }
    // 8. PMS check
    try {
        await node_fs_1.promises.access(node_path_1.default.join(root, "PROMPTS", "prompt_management_system.md"));
    }
    catch {
        warnings.push("Missing PROMPTS/prompt_management_system.md");
    }
    // 9. Memory Contract check
    try {
        const contractPath = node_path_1.default.join(root, "MEMORY", "memory_contract.md");
        const contractContent = await node_fs_1.promises.readFile(contractPath, "utf8");
        const requiredSections = [
            "## A. Identity",
            "## B. Preferences",
            "## C. Projects",
            "## D. Workflows",
            "## E. Rules",
            "## F. Capabilities",
            "## G. Limitations",
            "## H. Toolchain Awareness",
            "## I. PMS Awareness",
            "## J. Memory Governance"
        ];
        for (const section of requiredSections) {
            if (!contractContent.includes(section)) {
                errors.push(`Missing required section in memory_contract.md: ${section}`);
            }
        }
    }
    catch {
        errors.push("Missing MEMORY/memory_contract.md");
    }
    // 10. Coherence Layer check
    try {
        const coherenceLayerPath = node_path_1.default.join(root, "SYSTEM", "coherence_layer.md");
        const coherenceLayerContent = await node_fs_1.promises.readFile(coherenceLayerPath, "utf8");
        const requiredSections = [
            "## Purpose",
            "## Platforms",
            "## Shared Identity Contract",
            "## Shared Preferences",
            "## Shared Rules",
            "## Shared Workflows",
            "## Reasoning Constraints",
            "## Platform Overrides",
            "## Conflict Resolution"
        ];
        for (const section of requiredSections) {
            if (!coherenceLayerContent.includes(section)) {
                errors.push(`Missing required section in coherence_layer.md: ${section}`);
            }
        }
    }
    catch {
        errors.push("Missing SYSTEM/coherence_layer.md");
    }
    // 11. Agent Orchestration Contract check
    try {
        const contractPath = node_path_1.default.join(root, "SYSTEM", "agent_orchestration_contract.md");
        const contractContent = await node_fs_1.promises.readFile(contractPath, "utf8");
        const requiredSections = [
            "## Purpose",
            "## Agents",
            "## Shared Context Model",
            "## Delegation Rules",
            "## Escalation Rules",
            "## Synchronization Rules",
            "## Conflict Resolution",
            "## Parallelism Rules",
            "## Handoff Protocol",
            "## Failure Modes",
            "## Recovery Rules",
            "## Logging Requirements",
        ];
        for (const section of requiredSections) {
            if (!contractContent.includes(section)) {
                errors.push(`Missing required section in agent_orchestration_contract.md: ${section}`);
            }
        }
    }
    catch {
        errors.push("Missing SYSTEM/agent_orchestration_contract.md");
    }
    // 12. Execution Model check
    try {
        const modelPath = node_path_1.default.join(root, "SYSTEM", "execution_model.md");
        const modelContent = await node_fs_1.promises.readFile(modelPath, "utf8");
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
            if (!modelContent.includes(section)) {
                errors.push(`Missing required section in execution_model.md: ${section}`);
            }
        }
    }
    catch {
        errors.push("Missing SYSTEM/execution_model.md");
    }
    // 13. Operator Control Plane check
    try {
        const cpPath = node_path_1.default.join(root, "SYSTEM", "operator_control_plane.md");
        const cpContent = await node_fs_1.promises.readFile(cpPath, "utf8");
        const requiredSections = [
            "## Purpose",
            "## Operator Identity",
            "## Operator Authority Model",
            "## Operator Commands",
            "## Command Semantics",
            "## Policy Model",
            "## Audit Logging",
            "## Escalation to Operator",
            "## Operator Override Rules",
            "## Safety Model",
            "## Recovery Rules"
        ];
        for (const section of requiredSections) {
            if (!cpContent.includes(section)) {
                errors.push(`Missing required section in operator_control_plane.md: ${section}`);
            }
        }
    }
    catch {
        errors.push("Missing SYSTEM/operator_control_plane.md");
    }
    // 14. Policies check
    try {
        const policiesPath = node_path_1.default.join(root, "SYSTEM", "policies.md");
        const policiesContent = await node_fs_1.promises.readFile(policiesPath, "utf8");
        const requiredSections = [
            "## Purpose",
            "## Policy Types",
            "## Memory Policies",
            "## Workflow Policies",
            "## Toolchain Policies",
            "## Agent Selection Policies",
            "## Escalation Policies",
            "## Execution Policies",
            "## Safety Policies",
            "## Policy Inheritance Model",
            "## Policy Conflict Resolution",
            "## Policy Enforcement",
            "## Policy Logging"
        ];
        for (const section of requiredSections) {
            if (!policiesContent.includes(section)) {
                errors.push(`Missing required section in policies.md: ${section}`);
            }
        }
    }
    catch {
        errors.push("Missing SYSTEM/policies.md");
    }
    // 15. Meta-Operator Layer check
    try {
        const molPath = node_path_1.default.join(root, "SYSTEM", "meta_operator_layer.md");
        const molContent = await node_fs_1.promises.readFile(molPath, "utf8");
        const requiredSections = [
            "## Purpose",
            "## Meta-Analysis Engine",
            "## Meta-Audit Model",
            "## Policy Evolution Engine",
            "## Workflow Evolution Engine",
            "## Strategy Evolution Engine",
            "## Memory Evolution Engine",
            "## Meta-Operator Escalation",
            "## Evolution Safety Rules",
            "## Logging Requirements"
        ];
        for (const section of requiredSections) {
            if (!molContent.includes(section)) {
                errors.push(`Missing required section in meta_operator_layer.md: ${section}`);
            }
        }
    }
    catch {
        errors.push("Missing SYSTEM/meta_operator_layer.md");
    }
    // 16. Meta-Audit Engine check
    try {
        const auditPath = node_path_1.default.join(root, "SYSTEM", "meta_audit_engine.md");
        const auditContent = await node_fs_1.promises.readFile(auditPath, "utf8");
        const requiredSections = [
            "## Purpose",
            "## Audit Types",
            "## Audit Inputs",
            "## Audit Output Schema",
            "## Audit Frequency",
            "## Policy Audit Rules",
            "## Workflow Audit Rules",
            "## Strategy Audit Rules",
            "## Memory Audit Rules",
            "## Execution Audit Rules",
            "## Agent Performance Audit",
            "## Governance Audit",
            "## Meta-Audit Escalation",
            "## Logging Requirements"
        ];
        for (const section of requiredSections) {
            if (!auditContent.includes(section)) {
                errors.push(`Missing required section in meta_audit_engine.md: ${section}`);
            }
        }
    }
    catch {
        errors.push("Missing SYSTEM/meta_audit_engine.md");
    }
    // 17. Meta-Evolution Engine check
    try {
        const enginePath = node_path_1.default.join(root, "SYSTEM", "meta_evolution_engine.md");
        const engineContent = await node_fs_1.promises.readFile(enginePath, "utf8");
        const requiredSections = [
            "## Purpose",
            "## Evolution Types",
            "## Evolution Proposal Schema",
            "## Evolution Generation Rules",
            "## Evolution Ranking Model",
            "## Evolution Simulation Engine",
            "## Evolution Safety Rules",
            "## Operator Approval Workflow",
            "## Evolution Application Rules",
            "## Logging Requirements"
        ];
        for (const section of requiredSections) {
            if (!engineContent.includes(section)) {
                errors.push(`Missing required section in meta_evolution_engine.md: ${section}`);
            }
        }
    }
    catch {
        errors.push("Missing SYSTEM/meta_evolution_engine.md");
    }
    // 18. Meta-Evolution Log check
    try {
        const logPath = node_path_1.default.join(root, "SYSTEM", "meta_evolution_log.md");
        const logContent = await node_fs_1.promises.readFile(logPath, "utf8");
        const requiredSections = [
            "## Purpose",
            "## Log Entry Schema",
            "## Entry Types",
            "## Logging Rules",
            "## Rollback Rules",
            "## Operator Visibility",
            "## Integrity Guarantees",
            "## Entries"
        ];
        for (const section of requiredSections) {
            if (!logContent.includes(section)) {
                errors.push(`Missing required section in meta_evolution_log.md: ${section}`);
            }
        }
    }
    catch {
        errors.push("Missing SYSTEM/meta_evolution_log.md");
    }
    // 19. Meta-Evolution Simulator check
    try {
        const simulatorPath = node_path_1.default.join(root, "SYSTEM", "meta_evolution_simulator.md");
        const simulatorContent = await node_fs_1.promises.readFile(simulatorPath, "utf8");
        const requiredSections = [
            "## Purpose",
            "## Simulation Types",
            "## Simulation Input Schema",
            "## Simulation Output Schema",
            "## Simulation Engine Rules",
            "## Risk Model",
            "## Stability Model",
            "## Simulation Ranking Model",
            "## Operator Review Requirements",
            "## Logging Requirements"
        ];
        for (const section of requiredSections) {
            if (!simulatorContent.includes(section)) {
                errors.push(`Missing required section in meta_evolution_simulator.md: ${section}`);
            }
        }
    }
    catch {
        errors.push("Missing SYSTEM/meta_evolution_simulator.md");
    }
    // 20. Meta-Evolution Ranker check
    try {
        const rankerPath = node_path_1.default.join(root, "SYSTEM", "meta_evolution_ranker.md");
        const rankerContent = await node_fs_1.promises.readFile(rankerPath, "utf8");
        const requiredSections = [
            "## Purpose",
            "## Ranking Inputs",
            "## Ranking Criteria",
            "## Scoring Model",
            "## Composite Ranking Formula",
            "## Ranking Output Schema",
            "## Ranking Rules",
            "## Operator Controls",
            "## Logging Requirements"
        ];
        for (const section of requiredSections) {
            if (!rankerContent.includes(section)) {
                errors.push(`Missing required section in meta_evolution_ranker.md: ${section}`);
            }
        }
    }
    catch {
        errors.push("Missing SYSTEM/meta_evolution_ranker.md");
    }
    // 21. Memory Sync Pack check
    try {
        const syncPackDir = node_path_1.default.join(root, "EXPORT", "memory_sync_pack");
        const exportDir = node_path_1.default.join(root, "EXPORT");
        let packageJson;
        try {
            packageJson = JSON.parse(await node_fs_1.promises.readFile(node_path_1.default.join(root, "..", "package.json"), "utf8"));
        }
        catch {
            try {
                packageJson = JSON.parse(await node_fs_1.promises.readFile(node_path_1.default.join(root, "package.json"), "utf8"));
            }
            catch {
                packageJson = { version: "0.0.0" };
            }
        }
        const files = [
            "copilot_memory.txt",
            "gemini_memory.md",
            "claude_memory.md",
            "operator_doctrine.md",
            "memory_sync_manifest.json",
            "memory_sync_deltas.json"
        ];
        for (const file of files) {
            try {
                await node_fs_1.promises.access(node_path_1.default.join(syncPackDir, file));
            }
            catch {
                errors.push(`Missing Memory Sync Pack file: ${file}`);
            }
        }
        // Detailed Manifest Validation
        try {
            const manifestContent = await node_fs_1.promises.readFile(node_path_1.default.join(syncPackDir, "memory_sync_manifest.json"), "utf8");
            const manifest = JSON.parse(manifestContent);
            const requiredFields = ["ai_os_version", "memory_sync_pack_version", "generated_at", "git_commit", "files"];
            for (const field of requiredFields) {
                if (!manifest[field])
                    errors.push(`Manifest missing field: ${field}`);
            }
            if (manifest.memory_sync_pack_version && !/^\d{4}\.\d{2}\.\d{2}\.\d{2}$/.test(manifest.memory_sync_pack_version)) {
                errors.push(`Invalid memory_sync_pack_version format: ${manifest.memory_sync_pack_version}`);
            }
            for (const file in manifest.files) {
                const hash = manifest.files[file].sha256;
                if (!hash)
                    errors.push(`Manifest missing hash for file: ${file}`);
                else if (!/^[a-f0-9]{64}$/.test(hash)) {
                    errors.push(`Invalid hash format for ${file}: ${hash}`);
                }
            }
        }
        catch (err) {
            errors.push(`Manifest parsing/validation failed: ${err.message}`);
        }
        // Detailed Delta Validation
        try {
            const deltaContent = await node_fs_1.promises.readFile(node_path_1.default.join(syncPackDir, "memory_sync_deltas.json"), "utf8");
            const delta = JSON.parse(deltaContent);
            if (!delta.current_pack_version)
                errors.push("Delta missing current_pack_version");
            if (!Array.isArray(delta.files_changed))
                errors.push("Delta files_changed is not an array");
            else {
                const validReasons = ['hash_changed', 'file_added', 'file_removed'];
                for (const entry of delta.files_changed) {
                    if (!entry.file)
                        errors.push("Delta entry missing file name");
                    if (entry.changed) {
                        if (!entry.reason || !entry.summary) {
                            errors.push(`Delta entry for ${entry.file} missing reason or summary`);
                        }
                        if (entry.reason && !validReasons.includes(entry.reason)) {
                            errors.push(`Invalid delta reason for ${entry.file}: ${entry.reason}`);
                        }
                    }
                }
            }
        }
        catch (err) {
            errors.push(`Delta parsing/validation failed: ${err.message}`);
        }
        // Doctrine Integrity Check
        try {
            const systemDoc = await node_fs_1.promises.readFile(node_path_1.default.join(root, "SYSTEM", "operator_doctrine.md"), "utf8");
            const packDoc = await node_fs_1.promises.readFile(node_path_1.default.join(syncPackDir, "operator_doctrine.md"), "utf8");
            if (systemDoc.trim() !== packDoc.trim()) {
                errors.push("Doctrine mismatch between SYSTEM and Memory Sync Pack");
            }
        }
        catch (err) {
            errors.push(`Doctrine integrity check failed: ${err.message}`);
        }
        const archiveName = `memory_sync_pack_v${packageJson.version}.tar.gz`;
        try {
            await node_fs_1.promises.access(node_path_1.default.join(exportDir, archiveName));
        }
        catch {
            errors.push(`Missing Memory Sync Pack archive: ${archiveName}`);
        }
    }
    catch {
        errors.push("Missing EXPORT/memory_sync_pack directory");
    }
    const report = {
        timestamp: new Date().toISOString(),
        errors,
        warnings,
        status: errors.length === 0 ? "ok" : "failed"
    };
    await node_fs_1.promises.writeFile(reportFile, JSON.stringify(report, null, 2), "utf8");
    console.log(JSON.stringify({
        module: "validate",
        status: report.status,
        errors: errors.length,
        warnings: warnings.length
    }));
    return report.status === "ok";
}
