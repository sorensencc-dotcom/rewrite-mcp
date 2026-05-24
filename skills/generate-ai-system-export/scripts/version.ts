// version.ts — v0.1.0 — 2026-05-24

import { promises as fs } from "node:fs";
import path from "node:path";

export async function bumpVersion(root: string, mode: "patch" | "minor" | "major" = "patch") {
  const versionFile = path.join(root, "VERSION");
  const historyFile = path.join(root, "HISTORY.md");

  let oldVersion = "0.1.0";

  try {
    oldVersion = (await fs.readFile(versionFile, "utf8")).trim();
  } catch {
    // initialize
  }

  const parts = oldVersion.split(".").map(Number);
  let [major, minor, patch] = parts.length === 3 ? parts : [0, 1, 0];

  if (mode === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (mode === "minor") {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }

  const newVersion = `${major}.${minor}.${patch}`;

  await fs.writeFile(versionFile, newVersion + "
", "utf8");

  const today = new Date().toISOString().slice(0, 10);

  const entry = [
    `## v${newVersion} — ${today}`,
    ``,
    `- Export completed`,
    `- Platforms: Claude, Copilot, Gemini`,
    `- Subsystems: generate, normalize, merge, version`,
    `- Notes: automated entry`,
    ``,
  ].join("
");

  await fs.appendFile(historyFile, entry, "utf8");
  // If historyFile doesn't exist, fs.appendFile will create it. No need for try/catch

  console.log(JSON.stringify({
    module: "version",
    oldVersion,
    newVersion,
    mode,
    status: "ok"
  }));
}
