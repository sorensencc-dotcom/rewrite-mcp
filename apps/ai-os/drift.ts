// drift.ts — v0.1.0 — 2026-05-24

import { promises as fs } from "node:fs";
import path from "node:path";

export async function detectDrift(currentRoot: string, previousRoot: string) {
  const driftDir = path.join(currentRoot, "DRIFT");
  await fs.mkdir(driftDir, { recursive: true });

  const driftFile = path.join(driftDir, "drift.json");

  const currentFiles = await listFiles(currentRoot);
  let previousFiles: Record<string, string> = {};

  try {
    previousFiles = await listFiles(previousRoot);
  } catch {
    // If previousRoot does not exist, treat as an empty baseline.
    // The syncPrevious function will create it later.
    previousFiles = {};
  }

  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];
  const unchanged: string[] = [];

  for (const file of Object.keys(currentFiles)) {
    if (!(file in previousFiles)) {
      added.push(file);
    } else if (currentFiles[file] !== previousFiles[file]) {
      modified.push(file);
    } else {
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

  await fs.writeFile(driftFile, JSON.stringify(drift, null, 2), "utf8");

  console.log(JSON.stringify({
    module: "drift",
    status: "ok",
    added,
    removed,
    modified
  }));

  await syncPrevious(currentRoot, previousRoot);
}

async function listFiles(root: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};

  async function walk(dir: string, prefix = "") {
    let entries: any[] = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith("_") || entry.name === "DRIFT") continue;

      const full = path.join(dir, entry.name);
      const rel = path.join(prefix, entry.name);

      if (entry.isDirectory()) {
        await walk(full, rel);
      } else {
        try {
          const content = await fs.readFile(full, "utf8");
          out[rel] = content;
        } catch {}
      }
    }
  }

  await walk(root);
  return out;
}

async function syncPrevious(currentRoot: string, previousRoot: string) {
  await fs.rm(previousRoot, { recursive: true, force: true });
  await copyDir(currentRoot, previousRoot);
}

async function copyDir(src: string, dest: string) {
  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith("_") || entry.name === "DRIFT") continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}
