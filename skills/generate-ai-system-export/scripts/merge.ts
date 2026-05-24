// merge.ts — v0.1.0 — 2026-05-24

import { promises as fs } from "node:fs";
import path from "node:path";

export async function mergeNormalized(inputRoot: string, outputRoot: string) {
  const platforms = ["claude", "copilot", "gemini"];
  const categories = [
    "SYSTEM",
    "MEMORY",
    "RULES",
    "SKILLS",
    "AGENTS",
    "HOOKS",
    "PLUGINS",
    "CONNECTORS",
    "WORKFLOWS",
    "PROMPTS",
    "CAPABILITIES",
    "LIMITATIONS"
  ];

  await fs.mkdir(outputRoot, { recursive: true });

  for (const category of categories) {
    const categoryOut = path.join(outputRoot, category);
    await fs.mkdir(categoryOut, { recursive: true });

    for (const platform of platforms) {
      const src = path.join(inputRoot, platform, category);
      const dest = path.join(categoryOut, `${platform.toLowerCase()}_${category.toLowerCase()}.md`);

      try {
        const files = await fs.readdir(src);
        const merged = [];

        for (const file of files) {
          const full = path.join(src, file);
          const content = await fs.readFile(full, "utf8");
          merged.push(`# ${file}

${content}`);
        }

        await fs.writeFile(dest, merged.join("

---

"), "utf8");

        console.log(JSON.stringify({ module: "merge", category, platform, status: "ok" }));
      } catch (err) {
        await fs.writeFile(dest, `# ${platform} ${category}

_No data available._
`, "utf8");
        console.log(JSON.stringify({ module: "merge", category, platform, status: "missing" }));
      }
    }
  }

  await mergeUnifiedMemory(inputRoot, outputRoot);
}

async function mergeUnifiedMemory(inputRoot: string, outputRoot: string) {
  const out = path.join(outputRoot, "MEMORY", "unified_memory.md");
  const platforms = ["claude", "copilot", "gemini"];
  const sections = [];

  for (const platform of platforms) {
    const src = path.join(inputRoot, platform, "MEMORY");
    try {
      const files = await fs.readdir(src);
      const merged = [];

      for (const file of files) {
        const full = path.join(src, file);
        const content = await fs.readFile(full, "utf8");
        merged.push(`# ${platform}: ${file}

${content}`);
      }

      sections.push(merged.join("

"));
    } catch {
      sections.push(`# ${platform}

_No memory available._`);
    }
  }

  await fs.writeFile(out, sections.join("

---

"), "utf8");

  console.log(JSON.stringify({ module: "merge", category: "MEMORY", platform: "all", status: "ok" }));
}
