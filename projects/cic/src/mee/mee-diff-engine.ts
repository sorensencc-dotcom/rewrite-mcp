// File: projects/cic/src/mee/mee-diff-engine.ts | Date: 2026-06-03 | v1.0.0

import fs from "node:fs";
import path from "node:path";
import { PhasePatch } from "./mee-schema.js";

export interface DiffChunk {
  type: "context" | "add" | "remove";
  oldLine: number | null;
  newLine: number | null;
  content: string;
}

export interface DiffResult {
  path: string;
  oldContent: string | null;
  newContent: string;
  chunks: DiffChunk[];
}

export class MeeDiffEngine {
  generateDiff(patch: PhasePatch): DiffResult {
    const full = path.join(process.cwd(), patch.path);

    const oldContent = fs.existsSync(full)
      ? fs.readFileSync(full, "utf8")
      : null;

    const newContent = patch.content;

    const oldLines = oldContent ? oldContent.split("\n") : [];
    const newLines = newContent.split("\n");

    const chunks: DiffChunk[] = [];
    const max = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < max; i++) {
      const oldLine = oldLines[i] ?? null;
      const newLine = newLines[i] ?? null;

      if (oldLine === newLine) {
        chunks.push({
          type: "context",
          oldLine: i + 1,
          newLine: i + 1,
          content: oldLine ?? "",
        });
      } else {
        if (oldLine !== null) {
          chunks.push({
            type: "remove",
            oldLine: i + 1,
            newLine: null,
            content: oldLine,
          });
        }
        if (newLine !== null) {
          chunks.push({
            type: "add",
            oldLine: null,
            newLine: i + 1,
            content: newLine,
          });
        }
      }
    }

    return {
      path: patch.path,
      oldContent,
      newContent,
      chunks,
    };
  }
}
