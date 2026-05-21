import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const CHANGELOG_PATH = path.join(REPO_ROOT, "docs/CHANGELOG.md");
const RELEASES_DIR = path.join(REPO_ROOT, "docs/releases");

function getLatestChangelogBlock() {
  const text = fs.readFileSync(CHANGELOG_PATH, "utf8");
  const parts = text.split(/^## /m).filter(p => p.trim() && !p.trim().startsWith("# "));
  if (parts.length === 0) {
    throw new Error("No changelog blocks found");
  }
  const latest = parts[0]; // newest at top
  const [header, ...bodyLines] = latest.split("\n");
  const version = header.trim();
  const body = bodyLines.join("\n").trim();
  return { version, body };
}

function classifyLines(body) {
  const lines = body
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.startsWith("- "));

  const buckets = {
    features: [],
    fixes: [],
    infra: [],
    docs: [],
    mas: [],
    controlPlane: [],
    other: []
  };

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (lower.includes("mas")) buckets.mas.push(line);
    else if (lower.includes("control plane")) buckets.controlPlane.push(line);
    else if (lower.includes("doc") || lower.includes("changelog") || lower.includes("roadmap"))
      buckets.docs.push(line);
    else if (lower.includes("fix") || lower.includes("bug"))
      buckets.fixes.push(line);
    else if (lower.includes("infra") || lower.includes("telemetry") || lower.includes("pipeline"))
      buckets.infra.push(line);
    else buckets.features.push(line);
  }

  return buckets;
}

function renderReleaseNotes(version, buckets) {
  const sections = [];

  sections.push(`# CIC ${version} Release Notes\n`);

  if (buckets.features.length) {
    sections.push("## Features");
    sections.push(...buckets.features);
    sections.push("");
  }

  if (buckets.mas.length) {
    sections.push("## MAS & Intelligence Fabric");
    sections.push(...buckets.mas);
    sections.push("");
  }

  if (buckets.controlPlane.length) {
    sections.push("## Control Plane");
    sections.push(...buckets.controlPlane);
    sections.push("");
  }

  if (buckets.fixes.length) {
    sections.push("## Fixes");
    sections.push(...buckets.fixes);
    sections.push("");
  }

  if (buckets.infra.length) {
    sections.push("## Infra & Telemetry");
    sections.push(...buckets.infra);
    sections.push("");
  }

  if (buckets.docs.length) {
    sections.push("## Documentation");
    sections.push(...buckets.docs);
    sections.push("");
  }

  if (buckets.other.length) {
    sections.push("## Other Changes");
    sections.push(...buckets.other);
    sections.push("");
  }

  if (sections.length === 1) {
    sections.push("_No changes recorded._");
  }

  return sections.join("\n");
}

function renderShortSummary(version, buckets) {
  const highlights = [];

  if (buckets.mas.length) highlights.push("MAS observability");
  if (buckets.controlPlane.length) highlights.push("Control Plane upgrades");
  if (buckets.infra.length) highlights.push("infra/telemetry");
  if (buckets.features.length) highlights.push("new features");
  if (buckets.fixes.length) highlights.push("bug fixes");

  const core = highlights.length
    ? highlights.join(", ")
    : "internal improvements";

  return `CIC ${version}: ${core}.`;
}

function main() {
  try {
    const { version, body } = getLatestChangelogBlock();
    const buckets = classifyLines(body);

    const full = renderReleaseNotes(version, buckets);
    const summary = renderShortSummary(version, buckets);

    // Sanitize version for filename
    const versionMatch = version.match(/\[?(\d+\.\d+\.\d+)\]?/);
    const versionNum = versionMatch ? versionMatch[1] : version.replace(/[^a-zA-Z0-9.-]/g, "_");

    if (!fs.existsSync(RELEASES_DIR)) {
      fs.mkdirSync(RELEASES_DIR, { recursive: true });
    }

    fs.writeFileSync(path.join(RELEASES_DIR, `${versionNum}.md`), full);
    fs.writeFileSync(path.join(RELEASES_DIR, `${versionNum}.summary.txt`), summary);

    console.log("Release notes generated for", version);
    console.log(summary);
  } catch (error) {
    console.error("Error generating release notes:", error.message);
    process.exit(1);
  }
}

main();
