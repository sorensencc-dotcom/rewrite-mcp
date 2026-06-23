"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// File: projects/cic/tests/runtime/skills.contract.test.ts | Date: 2026-05-30 | v1.4.0
const vitest_1 = require("vitest");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const SkillRegistryLoader_js_1 = require("../../src/skills/SkillRegistryLoader.js");
const RedesignAgent_js_1 = require("../../src/skills/RedesignAgent.js");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
(0, vitest_1.describe)("Skill Registry Loader & RedesignAgent Contract Tests", () => {
    const tempSkillsDir = path_1.default.resolve(__dirname, "../../data/temp-skills-test");
    const tempSkillPath = path_1.default.join(tempSkillsDir, "rewritelabs", "redesign", "best_skill.md");
    (0, vitest_1.beforeEach)(() => {
        if (fs_1.default.existsSync(tempSkillsDir)) {
            fs_1.default.rmSync(tempSkillsDir, { recursive: true, force: true });
        }
    });
    (0, vitest_1.afterEach)(() => {
        if (fs_1.default.existsSync(tempSkillsDir)) {
            fs_1.default.rmSync(tempSkillsDir, { recursive: true, force: true });
        }
        SkillRegistryLoader_js_1.skillRegistryLoader.closeWatcher();
    });
    (0, vitest_1.it)("should fail loading if skill does not exist", async () => {
        const loader = new SkillRegistryLoader_js_1.SkillRegistryLoader(tempSkillsDir);
        await (0, vitest_1.expect)(loader.loadSkill(tempSkillPath)).rejects.toThrow();
    });
    (0, vitest_1.it)("should load skill correctly, parse frontmatter, and instantiate redesign agent", async () => {
        fs_1.default.mkdirSync(path_1.default.dirname(tempSkillPath), { recursive: true });
        fs_1.default.writeFileSync(tempSkillPath, `---
name: RewriteLabs Redesign Test
version: 2.1.4
description: Evolved tests
---
# Content
Test skill contents.`, "utf-8");
        const loader = new SkillRegistryLoader_js_1.SkillRegistryLoader(tempSkillsDir);
        const skill = await loader.loadSkill(tempSkillPath);
        (0, vitest_1.expect)(skill.name).toBe("RewriteLabs Redesign Test");
        (0, vitest_1.expect)(skill.version).toBe("2.1.4");
        (0, vitest_1.expect)(skill.sha256).toBeDefined();
        const agent = new RedesignAgent_js_1.RedesignAgent(skill);
        (0, vitest_1.expect)(agent.getSkill().version).toBe("2.1.4");
        const plan = agent.generate({
            dom: "<html></html>",
            contentBlocks: [{ type: "test" }],
            auditDeltas: { contrast_gaps: 0.9 },
            metadata: { brandVoice: "vibrant" }
        });
        (0, vitest_1.expect)(plan).toContain("# Redesign Summary");
        (0, vitest_1.expect)(plan).toContain("# Information Architecture");
        (0, vitest_1.expect)(plan).toContain("# Accessibility & Performance");
        (0, vitest_1.expect)(plan).toContain("using Redesign v2.1.4");
    });
    (0, vitest_1.it)("should watch and reload skill upon modification", async () => {
        fs_1.default.mkdirSync(path_1.default.dirname(tempSkillPath), { recursive: true });
        fs_1.default.writeFileSync(tempSkillPath, `---
name: Watcher Redesign
version: 1.0.0
---
Initial.`, "utf-8");
        const loader = new SkillRegistryLoader_js_1.SkillRegistryLoader(tempSkillsDir);
        const skill = await loader.loadSkill(tempSkillPath);
        (0, vitest_1.expect)(skill.version).toBe("1.0.0");
        let reloadTriggered = false;
        let newSkillVersion = "";
        await loader.watch((updatedSkill) => {
            reloadTriggered = true;
            newSkillVersion = updatedSkill.version;
        });
        // Write updated skill
        fs_1.default.writeFileSync(tempSkillPath, `---
name: Watcher Redesign
version: 1.0.1
---
Updated.`, "utf-8");
        // Give watcher file system sync time
        await new Promise((resolve) => setTimeout(resolve, 300));
        (0, vitest_1.expect)(reloadTriggered).toBe(true);
        (0, vitest_1.expect)(newSkillVersion).toBe("1.0.1");
        loader.closeWatcher();
    });
});
//# sourceMappingURL=skills.contract.test.js.map