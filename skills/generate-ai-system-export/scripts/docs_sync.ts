// docs_sync.ts — v0.1.0 — 2026-05-24

import { promises as fs } from "node:fs";
import path from "node:path";

export async function syncDocs(root: string, docsRoot: string) {
  await fs.mkdir(docsRoot, { recursive: true });

  const versionFile = path.join(root, "VERSION");
  const historyFile = path.join(root, "HISTORY.md");

  let version = "0.1.0";
  try {
    version = (await fs.readFile(versionFile, "utf8")).trim();
  } catch {}

  let history = "";
  try {
    history = await fs.readFile(historyFile, "utf8");
  } catch {}

  const overview = await buildOverview(root, version);
  const changelog = `# AI-OS Changelog

${history}`;

  await fs.writeFile(path.join(docsRoot, "ai-os-overview.md"), overview, "utf8");
  await fs.writeFile(path.join(docsRoot, "ai-os-changelog.md"), changelog, "utf8");

  console.log(JSON.stringify({ module: "docs", status: "ok" }));
}

async function buildOverview(root: string, version: string) {
  const tree = await buildTree(root);

  return [
    `# AI Operating System — Overview`,
    ``,
    `## Version`,
    `v${version}`,
    ``,
    `## Directory Structure`,
    "```text",
    tree,
    "```",
    ``,
    `## Description`,
    `A unified, deterministic export of Claude, Copilot, and Gemini system metadata.`,
    ``,
    `## Categories`,
    `- SYSTEM`,
    `- MEMORY`,
    `- RULES`,
    `- SKILLS`,
    `- AGENTS`,
    `- HOOKS`,
    `- PLUGINS`,
    `- CONNECTORS`,
    `- WORKFLOWS`,
    `- PROMPTS`,
    `- CAPABILITIES`,
    `- LIMITATIONS`,
    ``,
    `## Platforms`,
    `- Claude`,
    `- Copilot`,
    `- Gemini`,
    ``
  ].join("
");
}

async function buildTree(root: string, prefix = ""): Promise<string> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const lines: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith("_")) continue;

    const isDir = entry.isDirectory();
    lines.push(`${prefix}${entry.name}/`);

    if (isDir) {
      const sub = await buildTree(path.join(root, entry.name), prefix + "  ");
      lines.push(sub);
    }
  }

  return lines.join("
");
}
