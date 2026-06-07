// File: projects/cic/src/mee/safety/rollback-engine.ts | Date: 2026-06-03 | v1.0.0

import fs from "node:fs";
import path from "node:path";
import { PhasePatch } from "../mee-schema.js";

export class MeeRollbackEngine {
  snapshot(patches: PhasePatch[]): Record<string, string | null> {
    const workspaceRoot = process.cwd();
    const backupMap: Record<string, string | null> = {};

    patches.forEach((patch) => {
      const fullPath = path.resolve(workspaceRoot, patch.path);
      if (fs.existsSync(fullPath)) {
        backupMap[patch.path] = fs.readFileSync(fullPath, "utf8");
      } else {
        backupMap[patch.path] = null;
      }
    });

    return backupMap;
  }

  restore(backupMap: Record<string, string | null>): void {
    const workspaceRoot = process.cwd();

    Object.entries(backupMap).forEach(([filePath, content]) => {
      const fullPath = path.resolve(workspaceRoot, filePath);
      if (content === null) {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } else {
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content, "utf8");
      }
    });
  }
}
