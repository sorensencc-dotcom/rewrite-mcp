"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.skillRegistryLoader = exports.SkillRegistryLoader = void 0;
// File: projects/cic/src/skills/SkillRegistryLoader.ts | Date: 2026-05-30 | v1.4.0
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
class SkillRegistryLoader {
    constructor(skillsDir = path_1.default.resolve(__dirname, "../../../skills")) {
        this.activeSkill = null;
        this.watcher = null;
        this.skillsDir = skillsDir;
    }
    async loadSkill(skillPath) {
        if (!fs_1.default.existsSync(skillPath)) {
            throw new Error(`[SkillRegistryLoader] Redesign skill not found at ${skillPath}`);
        }
        const raw = fs_1.default.readFileSync(skillPath, "utf-8");
        const sha256 = crypto_1.default.createHash("sha256").update(raw).digest("hex");
        // Extract version from YAML frontmatter
        const versionMatch = raw.match(/^---\n[\s\S]*?version:\s*([0-9]+\.[0-9]+\.[0-9]+)/m);
        const version = versionMatch?.[1] ?? "0.0.0";
        const nameMatch = raw.match(/^---\n[\s\S]*?name:\s*([^\n]+)/m);
        const name = nameMatch?.[1]?.trim() ?? "RewriteLabs Redesign";
        const skill = {
            name,
            version,
            raw,
            path: skillPath,
            sha256
        };
        this.activeSkill = skill;
        return skill;
    }
    getActiveSkill() {
        return this.activeSkill;
    }
    async watch(onChanged) {
        const targetPath = path_1.default.join(this.skillsDir, "rewritelabs", "redesign", "best_skill.md");
        const targetDir = path_1.default.dirname(targetPath);
        if (!fs_1.default.existsSync(targetDir)) {
            fs_1.default.mkdirSync(targetDir, { recursive: true });
        }
        if (this.watcher) {
            this.watcher.close();
        }
        this.watcher = fs_1.default.watch(targetDir, async (eventType, filename) => {
            if (filename === "best_skill.md" && fs_1.default.existsSync(targetPath)) {
                try {
                    const currentHash = this.activeSkill?.sha256;
                    const newSkill = await this.loadSkill(targetPath);
                    if (newSkill.sha256 !== currentHash) {
                        console.log(`[SkillRegistryLoader] Evolved skill loaded: ${newSkill.name} v${newSkill.version} (hash: ${newSkill.sha256.slice(0, 8)})`);
                        if (onChanged) {
                            onChanged(newSkill);
                        }
                    }
                }
                catch (err) {
                    console.error(`[SkillRegistryLoader] Error reloading watched skill:`, err.message);
                }
            }
        });
    }
    async logDeployment(skill, metrics, previousVersion) {
        try {
            const logsDir = path_1.default.resolve(__dirname, "../../data/skills");
            if (!fs_1.default.existsSync(logsDir)) {
                fs_1.default.mkdirSync(logsDir, { recursive: true });
            }
            const logPath = path_1.default.join(logsDir, "skill-evolution.jsonl");
            const entry = {
                timestamp: new Date().toISOString(),
                skill_name: skill.name,
                skill_version: skill.version,
                action: "deployed",
                cic_version: "1.4.0",
                sha256: skill.sha256,
                metrics,
                previous_version: previousVersion || "0.0.0"
            };
            fs_1.default.appendFileSync(logPath, JSON.stringify(entry) + "\n", "utf-8");
            console.log(`[SkillRegistryLoader] Deployment logged successfully for ${skill.name} v${skill.version}`);
        }
        catch (err) {
            console.error(`[SkillRegistryLoader] Failed to log deployment:`, err.message);
        }
    }
    closeWatcher() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
    }
}
exports.SkillRegistryLoader = SkillRegistryLoader;
exports.skillRegistryLoader = new SkillRegistryLoader();
//# sourceMappingURL=SkillRegistryLoader.js.map