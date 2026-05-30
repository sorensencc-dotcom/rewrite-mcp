// File: projects/cic/tests/runtime/skills.contract.test.ts | Date: 2026-05-30 | v1.4.0
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SkillRegistryLoader, skillRegistryLoader } from "../../src/skills/SkillRegistryLoader.js";
import { RedesignAgent } from "../../src/skills/RedesignAgent.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Skill Registry Loader & RedesignAgent Contract Tests", () => {
  const tempSkillsDir = path.resolve(__dirname, "../../data/temp-skills-test");
  const tempSkillPath = path.join(tempSkillsDir, "rewritelabs", "redesign", "best_skill.md");

  beforeEach(() => {
    if (fs.existsSync(tempSkillsDir)) {
      fs.rmSync(tempSkillsDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempSkillsDir)) {
      fs.rmSync(tempSkillsDir, { recursive: true, force: true });
    }
    skillRegistryLoader.closeWatcher();
  });

  it("should fail loading if skill does not exist", async () => {
    const loader = new SkillRegistryLoader(tempSkillsDir);
    await expect(loader.loadSkill(tempSkillPath)).rejects.toThrow();
  });

  it("should load skill correctly, parse frontmatter, and instantiate redesign agent", async () => {
    fs.mkdirSync(path.dirname(tempSkillPath), { recursive: true });
    fs.writeFileSync(
      tempSkillPath,
      `---
name: RewriteLabs Redesign Test
version: 2.1.4
description: Evolved tests
---
# Content
Test skill contents.`,
      "utf-8"
    );

    const loader = new SkillRegistryLoader(tempSkillsDir);
    const skill = await loader.loadSkill(tempSkillPath);

    expect(skill.name).toBe("RewriteLabs Redesign Test");
    expect(skill.version).toBe("2.1.4");
    expect(skill.sha256).toBeDefined();

    const agent = new RedesignAgent(skill);
    expect(agent.getSkill().version).toBe("2.1.4");

    const plan = agent.generate({
      dom: "<html></html>",
      contentBlocks: [{ type: "test" }],
      auditDeltas: { contrast_gaps: 0.9 },
      metadata: { brandVoice: "vibrant" }
    });

    expect(plan).toContain("# Redesign Summary");
    expect(plan).toContain("# Information Architecture");
    expect(plan).toContain("# Accessibility & Performance");
    expect(plan).toContain("using Redesign v2.1.4");
  });

  it("should watch and reload skill upon modification", async () => {
    fs.mkdirSync(path.dirname(tempSkillPath), { recursive: true });
    fs.writeFileSync(
      tempSkillPath,
      `---
name: Watcher Redesign
version: 1.0.0
---
Initial.`,
      "utf-8"
    );

    const loader = new SkillRegistryLoader(tempSkillsDir);
    const skill = await loader.loadSkill(tempSkillPath);
    expect(skill.version).toBe("1.0.0");

    let reloadTriggered = false;
    let newSkillVersion = "";

    await loader.watch((updatedSkill) => {
      reloadTriggered = true;
      newSkillVersion = updatedSkill.version;
    });

    // Write updated skill
    fs.writeFileSync(
      tempSkillPath,
      `---
name: Watcher Redesign
version: 1.0.1
---
Updated.`,
      "utf-8"
    );

    // Give watcher file system sync time
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(reloadTriggered).toBe(true);
    expect(newSkillVersion).toBe("1.0.1");

    loader.closeWatcher();
  });
});
