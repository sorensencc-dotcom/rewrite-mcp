"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_fetch_1 = __importDefault(require("node-fetch"));
// Drift detection constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACTIVE_HOURS = 24;
const STALL_HOURS = 14 * 24; // 14 days
async function detectDrift(repoPath) {
    const changes = [];
    let lastModified = "unknown";
    let driftSummary = "no drift";
    try {
        // Check last modified time of repo root
        if (node_fs_1.default.existsSync(repoPath)) {
            const stats = node_fs_1.default.statSync(repoPath);
            lastModified = stats.mtime.toISOString();
            // Detect if directory has recent activity (< ACTIVE_HOURS)
            const now = Date.now();
            const mtime = stats.mtime.getTime();
            const hoursSinceModified = (now - mtime) / (1000 * 60 * 60);
            if (hoursSinceModified < ACTIVE_HOURS) {
                changes.push(`Directory modified in last ${ACTIVE_HOURS} hours`);
            }
            // Check for package.json changes (indicates activity)
            const pkgJsonPath = node_path_1.default.join(repoPath, "package.json");
            if (node_fs_1.default.existsSync(pkgJsonPath)) {
                const pkgStats = node_fs_1.default.statSync(pkgJsonPath);
                const pkgHours = (now - pkgStats.mtime.getTime()) / (1000 * 60 * 60);
                if (pkgHours < ACTIVE_HOURS) {
                    changes.push("package.json updated");
                }
            }
            // Check for test directory
            const testDir = node_path_1.default.join(repoPath, "test");
            const testsDir = node_path_1.default.join(repoPath, "tests");
            const srcDir = node_path_1.default.join(repoPath, "src");
            if (node_fs_1.default.existsSync(testDir) || node_fs_1.default.existsSync(testsDir)) {
                changes.push("Tests directory present");
            }
            if (node_fs_1.default.existsSync(srcDir)) {
                changes.push("Source code directory present");
            }
            // Look for COMPLETE_MARKER or status files
            const completeMarker = node_path_1.default.join(repoPath, "COMPLETE_MARKER");
            const statusFile = node_path_1.default.join(repoPath, "STATUS.md");
            if (node_fs_1.default.existsSync(completeMarker)) {
                changes.push("COMPLETE_MARKER found");
                driftSummary = "marked complete";
            }
            else if (node_fs_1.default.existsSync(statusFile)) {
                const statusStats = node_fs_1.default.statSync(statusFile);
                if (statusStats.size > MAX_FILE_SIZE) {
                    changes.push(`STATUS.md exceeds max size (${statusStats.size})`);
                }
                else {
                    const content = node_fs_1.default.readFileSync(statusFile, "utf-8");
                    if (content.includes("Shipped") || content.includes("shipped")) {
                        driftSummary = "shipped";
                        changes.push("Status: shipped");
                    }
                    else if (content.includes("In Progress")) {
                        driftSummary = "in progress";
                        changes.push("Status: in progress");
                    }
                }
            }
            else {
                // No explicit status, check recency
                if (hoursSinceModified > STALL_HOURS) {
                    driftSummary = `stalled (no activity > ${STALL_HOURS / 24} days)`;
                }
                else if (hoursSinceModified < 1) {
                    driftSummary = "active";
                }
                else {
                    driftSummary = "normal";
                }
            }
        }
        else {
            return {
                driftSummary: "repo directory not found",
                changes: [`Path does not exist: ${repoPath}`],
                lastModified: "n/a"
            };
        }
    }
    catch (err) {
        return {
            driftSummary: "error scanning",
            changes: [err.message],
            lastModified: "n/a"
        };
    }
    return { driftSummary, changes, lastModified };
}
function mapDriftToStatus(driftSummary) {
    if (driftSummary.includes("stalled"))
        return "Stalled";
    if (driftSummary.includes("shipped") || driftSummary.includes("complete"))
        return "Shipped";
    if (driftSummary.includes("active"))
        return "In Progress";
    return "Pending";
}
async function updateRoadmapDoc(docPath, result) {
    try {
        if (!node_fs_1.default.existsSync(docPath)) {
            console.error(`Roadmap doc not found: ${docPath}`);
            return;
        }
        const docStats = node_fs_1.default.statSync(docPath);
        if (docStats.size > MAX_FILE_SIZE) {
            console.error(`Roadmap doc exceeds max size: ${docPath} (${docStats.size} bytes)`);
            return;
        }
        let content = node_fs_1.default.readFileSync(docPath, "utf-8");
        const newStatus = mapDriftToStatus(result.driftSummary);
        // Find and update status tables for matching repo name
        // Pattern: | Phase/Name | ... | Status | where repo name appears nearby
        const lines = content.split("\n");
        let updated = false;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Look for table rows with status column
            if (line.includes("|") && line.includes("Status")) {
                // This is a status header, find rows below
                for (let j = i + 2; j < Math.min(i + 20, lines.length); j++) {
                    if (!lines[j].includes("|"))
                        break;
                    if (lines[j].includes("---"))
                        continue;
                    // Check if this row might match the repo
                    const isRepoRow = lines[j].toLowerCase().includes(result.name.toLowerCase()) ||
                        lines[j].toLowerCase().includes("in progress") ||
                        lines[j].toLowerCase().includes("pending") ||
                        lines[j].toLowerCase().includes("shipped");
                    if (isRepoRow && lines[j].includes("|")) {
                        // Update status in this row
                        const parts = lines[j].split("|");
                        if (parts.length > 2) {
                            // Typically: | Phase | Name | Status |
                            // Find status column (usually last non-empty)
                            for (let k = parts.length - 2; k >= 1; k--) {
                                if (k >= parts.length)
                                    continue; // bounds check
                                const cell = parts[k].trim();
                                if (cell.toLowerCase().includes("pending") ||
                                    cell.toLowerCase().includes("in progress") ||
                                    cell.toLowerCase().includes("shipped") ||
                                    cell.toLowerCase().includes("stalled")) {
                                    parts[k] = ` ${newStatus} `;
                                    lines[j] = parts.join("|");
                                    updated = true;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
        content = lines.join("\n");
        // Append update footer with timestamp and drift summary
        // Remove old sync footers first (last 3 sections if they look like footers)
        const footerPattern = /---\n\n\*\*Last synced:\*\*/;
        if (footerPattern.test(content)) {
            content = content.replace(/---\n\n\*\*Last synced:\*\*[\s\S]+?(?=\n|$)/m, "");
        }
        const footer = `\n\n---\n\n**Last synced:** ${new Date().toISOString()}\n` +
            `**Status:** ${result.driftSummary}\n` +
            `**Last modified:** ${result.lastModified}\n`;
        if (result.changes.length > 0) {
            content += footer + `**Changes:**\n${result.changes.map(c => `- ${c}`).join("\n")}`;
        }
        else {
            content += footer;
        }
        node_fs_1.default.writeFileSync(docPath, content, "utf-8");
        if (updated) {
            console.log(`    ✓ Updated status to "${newStatus}"`);
        }
    }
    catch (err) {
        console.error(`Failed to update ${docPath}: ${err.message}`);
    }
}
async function postSlack(webhook, results) {
    const timestamp = new Date().toISOString();
    const okCount = results.filter(r => r.status === "ok").length;
    const errorCount = results.filter(r => r.status === "error").length;
    const stalledCount = results.filter(r => r.status === "stalled").length;
    const blocks = [
        {
            type: "header",
            text: {
                type: "plain_text",
                text: "🔄 Daily Roadmap Sync Report"
            }
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `*Timestamp:* ${timestamp}\n` +
                    `✅ OK: ${okCount} | ⚠️ Stalled: ${stalledCount} | ❌ Errors: ${errorCount}\n` +
                    `*Repos scanned:* ${results.length}`
            }
        },
        {
            type: "divider"
        }
    ];
    for (const result of results) {
        const emoji = result.status === "ok" ? "✅" : result.status === "stalled" ? "⚠️" : "❌";
        blocks.push({
            type: "section",
            text: {
                type: "mrkdwn",
                text: `${emoji} *${result.name}*\n` +
                    `Status: ${result.driftSummary}\n` +
                    `Last modified: ${result.lastModified}` +
                    (result.changes.length ? `\nChanges:\n${result.changes.map(c => `• ${c}`).join("\n")}` : "") +
                    (result.error ? `\n_Error: ${result.error}_` : "")
            }
        });
    }
    try {
        const response = await (0, node_fetch_1.default)(webhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: "Daily roadmap sync",
                blocks
            })
        });
        if (!response.ok) {
            console.error(`Slack POST failed: ${response.status} ${response.statusText}`);
        }
    }
    catch (err) {
        console.error(`Failed to post to Slack: ${err.message}`);
    }
}
async function saveReport(reportDir, results) {
    const timestamp = new Date().toISOString().split("T")[0];
    const reportPath = node_path_1.default.join(reportDir, `roadmap-sync-${timestamp}.json`);
    try {
        if (!node_fs_1.default.existsSync(reportDir)) {
            node_fs_1.default.mkdirSync(reportDir, { recursive: true });
        }
        node_fs_1.default.writeFileSync(reportPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            summary: {
                total: results.length,
                ok: results.filter(r => r.status === "ok").length,
                stalled: results.filter(r => r.status === "stalled").length,
                errors: results.filter(r => r.status === "error").length
            },
            results
        }, null, 2), "utf-8");
        console.log(`Report saved: ${reportPath}`);
    }
    catch (err) {
        console.error(`Failed to save report: ${err.message}`);
    }
}
async function main() {
    const webhook = process.env.SLACK_WEBHOOK_URL || "https://hooks.slack.com/services/PLACEHOLDER";
    const registryPath = node_path_1.default.join(process.cwd(), "repo-registry.json");
    if (!node_fs_1.default.existsSync(registryPath)) {
        console.error(`Registry not found at ${registryPath}`);
        process.exit(1);
    }
    let registry;
    try {
        const registryJson = JSON.parse(node_fs_1.default.readFileSync(registryPath, "utf-8"));
        if (!Array.isArray(registryJson.repos)) {
            throw new Error("Registry repos field must be an array");
        }
        registry = registryJson;
    }
    catch (err) {
        console.error(`Failed to load registry: ${err.message}`);
        process.exit(1);
    }
    const results = [];
    console.log(`Starting daily roadmap sync (${new Date().toISOString()})`);
    console.log(`Base path: ${registry.basePath}`);
    console.log(`Scanning ${registry.repos.length} repos...`);
    for (const repo of registry.repos) {
        const repoPath = node_path_1.default.join(registry.basePath, repo.name);
        console.log(`\n[${repo.name}] Scanning ${repoPath}...`);
        try {
            const drift = await detectDrift(repoPath);
            const result = {
                name: repo.name,
                status: "ok",
                ...drift
            };
            // Mark as stalled if activity > STALL_HOURS
            if (drift.driftSummary.includes("stalled")) {
                result.status = "stalled";
            }
            results.push(result);
            console.log(`  → ${drift.driftSummary}`);
            // Update roadmap doc if it exists
            const docPath = node_path_1.default.join(registry.basePath, repo.roadmapDoc);
            if (node_fs_1.default.existsSync(docPath)) {
                await updateRoadmapDoc(docPath, result);
            }
        }
        catch (err) {
            const result = {
                name: repo.name,
                status: "error",
                driftSummary: "scan failed",
                changes: [],
                lastModified: "n/a",
                error: err.message
            };
            results.push(result);
            console.error(`  ✗ Error: ${err.message}`);
        }
    }
    // Save report
    await saveReport(registry.reportDir, results);
    // Post to Slack
    if (webhook !== "https://hooks.slack.com/services/PLACEHOLDER") {
        console.log("\nPosting to Slack...");
        await postSlack(webhook, results);
    }
    else {
        console.log("\n⚠️  Slack webhook not configured. Skipping notification.");
        console.log("   Set SLACK_WEBHOOK_URL environment variable to enable.");
    }
    console.log("\nSync complete.");
}
main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
