"use strict";
// diff.ts — v0.1.0 — 2026-05-24
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDiff = generateDiff;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
async function generateDiff(currentRoot, previousRoot) {
    const diffDir = node_path_1.default.join(currentRoot, "DIFF");
    await node_fs_1.promises.mkdir(diffDir, { recursive: true });
    const diffFile = node_path_1.default.join(diffDir, "diff.txt");
    const currentFiles = await listFiles(currentRoot);
    let previousFiles = {};
    try {
        previousFiles = await listFiles(previousRoot);
    }
    catch {
        previousFiles = {};
    }
    const allFiles = Array.from(new Set([...Object.keys(currentFiles), ...Object.keys(previousFiles)])).sort();
    const diffs = [];
    for (const file of allFiles) {
        const oldContent = previousFiles[file] ?? "";
        const newContent = currentFiles[file] ?? "";
        if (oldContent === newContent)
            continue;
        const diff = unifiedDiff(oldContent.split("\n"), newContent.split("\n"), `previous/${file}`, `current/${file}`);
        diffs.push(diff);
    }
    if (diffs.length === 0) {
        await node_fs_1.promises.writeFile(diffFile, "No differences detected.\n", "utf8");
    }
    else {
        await node_fs_1.promises.writeFile(diffFile, diffs.join("\n\n"), "utf8");
    }
    console.log(JSON.stringify({
        module: "diff",
        status: "ok",
        filesCompared: allFiles.length
    }));
}
async function listFiles(root) {
    const out = {};
    async function walk(dir, prefix = "") {
        let entries = [];
        try {
            entries = await node_fs_1.promises.readdir(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            if (entry.name.startsWith("_") ||
                entry.name === "DRIFT" ||
                entry.name === "VALIDATION" ||
                entry.name === "DIFF")
                continue;
            const full = node_path_1.default.join(dir, entry.name);
            const rel = node_path_1.default.join(prefix, entry.name);
            if (entry.isDirectory()) {
                await walk(full, rel);
            }
            else {
                try {
                    const content = await node_fs_1.promises.readFile(full, "utf8");
                    out[rel] = content;
                }
                catch { }
            }
        }
    }
    await walk(root);
    return out;
}
function unifiedDiff(oldLines, newLines, oldLabel, newLabel) {
    const diff = [];
    diff.push(`--- ${oldLabel}`);
    diff.push(`+++ ${newLabel}`);
    let i = 0;
    let j = 0;
    while (i < oldLines.length || j < newLines.length) {
        const oldLine = oldLines[i];
        const newLine = newLines[j];
        if (oldLine === newLine) {
            i++;
            j++;
            continue;
        }
        diff.push(`@@`);
        if (oldLine !== undefined)
            diff.push(`-${oldLine}`);
        if (newLine !== undefined)
            diff.push(`+${newLine}`);
        i++;
        j++;
    }
    return diff.join("\n");
}
