"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchLoader = exports.PatchLoader = void 0;
// File: projects/cic/src/cic/control-plane/patch-loader.ts | Date: 2026-06-01 | v1.5.0
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const yaml_1 = __importDefault(require("yaml"));
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
class PatchLoader {
    constructor(baseDir) {
        this.baseDir = baseDir || path_1.default.resolve(__dirname, "../../../instinct-patches");
        this.initializeDirectories();
    }
    initializeDirectories() {
        const folders = ["proposed", "canary", "active", "rejected"];
        for (const folder of folders) {
            const folderPath = path_1.default.join(this.baseDir, folder);
            if (!fs_1.default.existsSync(folderPath)) {
                fs_1.default.mkdirSync(folderPath, { recursive: true });
            }
        }
    }
    listPatches(status) {
        const list = [];
        const statuses = status ? [status] : ["proposed", "canary", "active", "rejected"];
        for (const s of statuses) {
            const folderPath = path_1.default.join(this.baseDir, s);
            if (!fs_1.default.existsSync(folderPath))
                continue;
            const files = fs_1.default.readdirSync(folderPath).filter(f => f.endsWith(".yaml") || f.endsWith(".yml"));
            for (const file of files) {
                try {
                    const fullPath = path_1.default.join(folderPath, file);
                    const raw = fs_1.default.readFileSync(fullPath, "utf-8");
                    const parsed = yaml_1.default.parse(raw);
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
        const oldPath = path_1.default.join(this.baseDir, from, fileName);
        const newPath = path_1.default.join(this.baseDir, to, fileName);
        if (!fs_1.default.existsSync(oldPath)) {
            throw new Error(`Instinct patch file '${fileName}' not found under '${from}' directory.`);
        }
        try {
            const raw = fs_1.default.readFileSync(oldPath, "utf-8");
            const parsed = yaml_1.default.parse(raw);
            // Merge modifications (e.g. updating scopes or status)
            const merged = {
                ...parsed,
                ...updates,
                status: to
            };
            // Write to new status folder
            fs_1.default.writeFileSync(newPath, yaml_1.default.stringify(merged), "utf-8");
            // Delete from old status folder
            fs_1.default.unlinkSync(oldPath);
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
        const fullPath = path_1.default.join(this.baseDir, "proposed", fileName);
        const fullPatch = {
            ...patch,
            status: "proposed",
            createdAt: new Date().toISOString(),
            createdBy: "proposer-engine"
        };
        fs_1.default.writeFileSync(fullPath, yaml_1.default.stringify(fullPatch), "utf-8");
        console.log(`[PatchLoader] Saved new proposed instinct patch to: proposed/${fileName}`);
    }
}
exports.PatchLoader = PatchLoader;
exports.patchLoader = new PatchLoader();
//# sourceMappingURL=patch-loader.js.map