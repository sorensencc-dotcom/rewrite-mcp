// File: projects/cic/src/skills/SkillRegistryLoader.ts | Date: 2026-05-30 | v1.4.0
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class SkillRegistryLoader {
    constructor(skillsDir = path.resolve(__dirname, "../../../skills")) {
        this.activeSkill = null;
        this.watcher = null;
        this.skillsDir = skillsDir;
    }
    async loadSkill(skillPath) {
        if (!fs.existsSync(skillPath)) {
            throw new Error(`[SkillRegistryLoader] Redesign skill not found at ${skillPath}`);
        }
        const raw = fs.readFileSync(skillPath, "utf-8");
        const sha256 = crypto.createHash("sha256").update(raw).digest("hex");
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
        const targetPath = path.join(this.skillsDir, "rewritelabs", "redesign", "best_skill.md");
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        if (this.watcher) {
            this.watcher.close();
        }
        this.watcher = fs.watch(targetDir, async (eventType, filename) => {
            if (filename === "best_skill.md" && fs.existsSync(targetPath)) {
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
            const logsDir = path.resolve(__dirname, "../../data/skills");
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }
            const logPath = path.join(logsDir, "skill-evolution.jsonl");
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
            fs.appendFileSync(logPath, JSON.stringify(entry) + "\n", "utf-8");
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
export const skillRegistryLoader = new SkillRegistryLoader();
//# sourceMappingURL=SkillRegistryLoader.js.map