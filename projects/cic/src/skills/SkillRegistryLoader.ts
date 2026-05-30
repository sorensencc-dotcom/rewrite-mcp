// File: projects/cic/src/skills/SkillRegistryLoader.ts | Date: 2026-05-30 | v1.4.0
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Skill {
  name: string;
  version: string;
  raw: string;
  path: string;
  sha256: string;
}

export interface Metrics {
  overall: number;
  structural_completeness?: number;
  heuristic_alignment?: number;
  accessibility_uplift?: number;
  performance_uplift?: number;
  brand_voice_similarity?: number;
  determinism_score?: number;
}

export class SkillRegistryLoader {
  private skillsDir: string;
  private activeSkill: Skill | null = null;
  private watcher: fs.FSWatcher | null = null;

  constructor(skillsDir: string = path.resolve(__dirname, "../../../skills")) {
    this.skillsDir = skillsDir;
  }

  async loadSkill(skillPath: string): Promise<Skill> {
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

    const skill: Skill = {
      name,
      version,
      raw,
      path: skillPath,
      sha256
    };

    this.activeSkill = skill;
    return skill;
  }

  getActiveSkill(): Skill | null {
    return this.activeSkill;
  }

  async watch(onChanged?: (skill: Skill) => void): Promise<void> {
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
        } catch (err: any) {
          console.error(`[SkillRegistryLoader] Error reloading watched skill:`, err.message);
        }
      }
    });
  }

  async logDeployment(skill: Skill, metrics: Metrics, previousVersion?: string): Promise<void> {
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
    } catch (err: any) {
      console.error(`[SkillRegistryLoader] Failed to log deployment:`, err.message);
    }
  }

  closeWatcher(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}

export const skillRegistryLoader = new SkillRegistryLoader();
