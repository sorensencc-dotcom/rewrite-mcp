// File: projects/cic/src/cic/control-plane/patch-loader.ts | Date: 2026-06-01 | v1.5.0
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import YAML from "yaml";
import { InstinctPatch, PatchStatus } from "./patch-model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PatchLoader {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.resolve(__dirname, "../../../instinct-patches");
    this.initializeDirectories();
  }

  private initializeDirectories(): void {
    const folders: PatchStatus[] = ["proposed", "canary", "active", "rejected"];
    for (const folder of folders) {
      const folderPath = path.join(this.baseDir, folder);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
    }
  }

  public listPatches(status?: PatchStatus): InstinctPatch[] {
    const list: InstinctPatch[] = [];
    const statuses: PatchStatus[] = status ? [status] : ["proposed", "canary", "active", "rejected"];

    for (const s of statuses) {
      const folderPath = path.join(this.baseDir, s);
      if (!fs.existsSync(folderPath)) continue;

      const files = fs.readdirSync(folderPath).filter(f => f.endsWith(".yaml") || f.endsWith(".yml"));
      for (const file of files) {
        try {
          const fullPath = path.join(folderPath, file);
          const raw = fs.readFileSync(fullPath, "utf-8");
          const parsed = YAML.parse(raw) as InstinctPatch;
          parsed.fileName = file;
          parsed.status = s;
          list.push(parsed);
        } catch (err: any) {
          console.error(`[PatchLoader] Failed to read patch '${file}' under '${s}':`, err.message);
        }
      }
    }

    return list;
  }

  public async movePatch(
    fileName: string,
    from: PatchStatus,
    to: PatchStatus,
    updates: Partial<InstinctPatch> = {}
  ): Promise<void> {
    const oldPath = path.join(this.baseDir, from, fileName);
    const newPath = path.join(this.baseDir, to, fileName);

    if (!fs.existsSync(oldPath)) {
      throw new Error(`Instinct patch file '${fileName}' not found under '${from}' directory.`);
    }

    try {
      const raw = fs.readFileSync(oldPath, "utf-8");
      const parsed = YAML.parse(raw) as InstinctPatch;

      // Merge modifications (e.g. updating scopes or status)
      const merged: InstinctPatch = {
        ...parsed,
        ...updates,
        status: to
      };

      // Write to new status folder
      fs.writeFileSync(newPath, YAML.stringify(merged), "utf-8");

      // Delete from old status folder
      fs.unlinkSync(oldPath);
      console.log(`[PatchLoader] Successfully moved instinct patch '${fileName}' from '${from}' to '${to}'.`);
    } catch (err: any) {
      console.error(`[PatchLoader] Error moving patch file:`, err.message);
      throw err;
    }
  }

  /**
   * Directly saves a newly generated proposed patch onto disk.
   */
  public saveProposedPatch(patch: Omit<InstinctPatch, "status" | "createdAt" | "createdBy">): void {
    const fileName = `${patch.instinct}-${patch.baseVersion}-${patch.proposedVersion}.yaml`;
    const fullPath = path.join(this.baseDir, "proposed", fileName);

    const fullPatch: InstinctPatch = {
      ...patch,
      status: "proposed",
      createdAt: new Date().toISOString(),
      createdBy: "proposer-engine"
    };

    fs.writeFileSync(fullPath, YAML.stringify(fullPatch), "utf-8");
    console.log(`[PatchLoader] Saved new proposed instinct patch to: proposed/${fileName}`);
  }
}

export const patchLoader = new PatchLoader();
