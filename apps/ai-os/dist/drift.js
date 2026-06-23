"use strict";
// drift.ts — v0.1.0 — 2026-05-24
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectDrift = detectDrift;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
async function detectDrift(currentRoot, previousRoot) {
    const driftDir = node_path_1.default.join(currentRoot, "DRIFT");
    await node_fs_1.promises.mkdir(driftDir, { recursive: true });
    const driftFile = node_path_1.default.join(driftDir, "drift.json");
    const currentFiles = await listFiles(currentRoot);
    let previousFiles = {};
    try {
        previousFiles = await listFiles(previousRoot);
    }
    catch {
        // If previousRoot does not exist, treat as an empty baseline.
        // The syncPrevious function will create it later.
        previousFiles = {};
    }
    const added = [];
    const removed = [];
    const modified = [];
    const unchanged = [];
    for (const file of Object.keys(currentFiles)) {
        if (!(file in previousFiles)) {
            added.push(file);
        }
        else if (currentFiles[file] !== previousFiles[file]) {
            modified.push(file);
        }
        else {
            unchanged.push(file);
        }
    }
    for (const file of Object.keys(previousFiles)) {
        if (!(file in currentFiles)) {
            removed.push(file);
        }
    }
    const drift = {
        timestamp: new Date().toISOString(),
        added,
        removed,
        modified,
        unchanged
    };
    await node_fs_1.promises.writeFile(driftFile, JSON.stringify(drift, null, 2), "utf8");
    console.log(JSON.stringify({
        module: "drift",
        status: "ok",
        added,
        removed,
        modified
    }));
    await syncPrevious(currentRoot, previousRoot);
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
            if (entry.name.startsWith("_") || entry.name === "DRIFT")
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
async function syncPrevious(currentRoot, previousRoot) {
    await node_fs_1.promises.rm(previousRoot, { recursive: true, force: true });
    await copyDir(currentRoot, previousRoot);
}
async function copyDir(src, dest) {
    await node_fs_1.promises.mkdir(dest, { recursive: true });
    const entries = await node_fs_1.promises.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name.startsWith("_") || entry.name === "DRIFT")
            continue;
        const srcPath = node_path_1.default.join(src, entry.name);
        const destPath = node_path_1.default.join(dest, entry.name);
        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath);
        }
        else {
            await node_fs_1.promises.copyFile(srcPath, destPath);
        }
    }
}
