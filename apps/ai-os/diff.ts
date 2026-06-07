// diff.ts — v0.1.0 — 2026-05-24

import { promises as fs } from "node:fs";
import path from "node:path";

export async function generateDiff(currentRoot: string, previousRoot: string) {
  const diffDir = path.join(currentRoot, "DIFF");
  await fs.mkdir(diffDir, { recursive: true });

  const diffFile = path.join(diffDir, "diff.txt");

  const currentFiles = await listFiles(currentRoot);
  let previousFiles: Record<string, string> = {};

  try {
    previousFiles = await listFiles(previousRoot);
  } catch {
    previousFiles = {};
  }

  const allFiles = Array.from(
    new Set([...Object.keys(currentFiles), ...Object.keys(previousFiles)])
  ).sort();

  const diffs: string[] = [];

  for (const file of allFiles) {
    const oldContent = previousFiles[file] ?? "";
    const newContent = currentFiles[file] ?? "";

    if (oldContent === newContent) continue;

    const diff = unifiedDiff(
      oldContent.split("\n"),
      newContent.split("\n"),
      `previous/${file}`,
      `current/${file}`
    );

    diffs.push(diff);
  }

  if (diffs.length === 0) {
    await fs.writeFile(diffFile, "No differences detected.\n", "utf8");
  } else {
    await fs.writeFile(diffFile, diffs.join("\n\n"), "utf8");
  }

  console.log(JSON.stringify({
    module: "diff",
    status: "ok",
    filesCompared: allFiles.length
  }));
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
      if (
        entry.name.startsWith("_") ||
        entry.name === "DRIFT" ||
        entry.name === "VALIDATION" ||
        entry.name === "DIFF"
      ) continue;

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

function unifiedDiff(oldLines: string[], newLines: string[], oldLabel: string, newLabel: string): string {
  const diff: string[] = [];

  diff.push(`--- ${oldLabel}`);
  diff.push(`+++ ${newLabel}`);

  let i = 0;
  let j = 0;

  while (i < oldLines.length || j < newLines.length) {
    const oldLine = oldLines[i];
    const newLine = newLines[j];

    if (oldLine === newLine) {
      i++; j++;
      continue;
    }

    diff.push(`@@`);
    if (oldLine !== undefined) diff.push(`-${oldLine}`);
    if (newLine !== undefined) diff.push(`+${newLine}`);

    i++;
    j++;
  }

  return diff.join("\n");
}
