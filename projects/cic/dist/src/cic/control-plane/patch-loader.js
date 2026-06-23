// File: projects/cic/src/cic/control-plane/patch-loader.ts | Date: 2026-06-01 | v1.5.0
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import YAML from "yaml";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class PatchLoader {
    constructor(baseDir) {
        this.baseDir = baseDir || path.resolve(__dirname, "../../../instinct-patches");
        this.initializeDirectories();
    }
    initializeDirectories() {
        const folders = ["proposed", "canary", "active", "rejected"];
        for (const folder of folders) {
            const folderPath = path.join(this.baseDir, folder);
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }
        }
    }
    listPatches(status) {
        const list = [];
        const statuses = status ? [status] : ["proposed", "canary", "active", "rejected"];
        for (const s of statuses) {
            const folderPath = path.join(this.baseDir, s);
            if (!fs.existsSync(folderPath))
                continue;
            const files = fs.readdirSync(folderPath).filter(f => f.endsWith(".yaml") || f.endsWith(".yml"));
            for (const file of files) {
                try {
                    const fullPath = path.join(folderPath, file);
                    const raw = fs.readFileSync(fullPath, "utf-8");
                    const parsed = YAML.parse(raw);
                    parsed.fileName = file;
                    parsed.status = s;
                    list.push(parsed);
                }
                catch (err) {
                    console.error(`[PatchLoader] Failed to read patch '${file}' under '${s}':`, err.message);
                }
            }
        }
        return list;
    }
    async movePatch(fileName, from, to, updates = {}) {
        const oldPath = path.join(this.baseDir, from, fileName);
        const newPath = path.join(this.baseDir, to, fileName);
        if (!fs.existsSync(oldPath)) {
            throw new Error(`Instinct patch file '${fileName}' not found under '${from}' directory.`);
        }
        try {
            const raw = fs.readFileSync(oldPath, "utf-8");
            const parsed = YAML.parse(raw);
            // Merge modifications (e.g. updating scopes or status)
            const merged = {
                ...parsed,
                ...updates,
                status: to
            };
            // Write to new status folder
            fs.writeFileSync(newPath, YAML.stringify(merged), "utf-8");
            // Delete from old status folder
            fs.unlinkSync(oldPath);
            console.log(`[PatchLoader] Successfully moved instinct patch '${fileName}' from '${from}' to '${to}'.`);
        }
        catch (err) {
            console.error(`[PatchLoader] Error moving patch file:`, err.message);
            throw err;
        }
    }
    /**
     * Directly saves a newly generated proposed patch onto disk.
     */
    saveProposedPatch(patch) {
        const fileName = `${patch.instinct}-${patch.baseVersion}-${patch.proposedVersion}.yaml`;
        const fullPath = path.join(this.baseDir, "proposed", fileName);
        const fullPatch = {
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
//# sourceMappingURL=patch-loader.js.map