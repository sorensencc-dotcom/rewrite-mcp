import fs from "fs";
import path from "path";

const CONTRACT_PATHS = [
  path.resolve(process.cwd(), "projects/cic/docs/CIC_AI_RUNTIME_CONTRACT.md"),
  path.resolve(__dirname, "../../projects/cic/docs/CIC_AI_RUNTIME_CONTRACT.md")
];

function findContractPath(): string | null {
  for (const p of CONTRACT_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function readContractRaw(): string {
  const p = findContractPath();
  if (!p) throw new Error("CIC_AI_RUNTIME_CONTRACT.md not found in expected locations");
  return fs.readFileSync(p, "utf8");
}

function extractVersion(md: string): string | null {
  const m = md.match(/^\s*\*\*Version:\*\*\s*([0-9]+\.[0-9]+\.[0-9]+)/mi);
  if (m) return m[1];
  const m2 = md.match(/^Version:\s*([0-9]+\.[0-9]+\.[0-9]+)/mi);
  return m2 ? m2[1] : null;
}

function extractTopSections(md: string): string[] {
  const lines = md.split(/\r?\n/);
  const sections: string[] = [];
  for (const l of lines) {
    const m = l.match(/^\s*##+\s+(.*)/);
    if (m) sections.push(m[1].trim());
  }
  return sections;
}

export function loadRuntimeContract(): {
  path: string;
  raw: string;
  version: string | null;
  sections: string[];
} {
  const p = findContractPath();
  if (!p) throw new Error("CIC_AI_RUNTIME_CONTRACT.md not found");
  const raw = fs.readFileSync(p, "utf8");
  const version = extractVersion(raw);
  const sections = extractTopSections(raw);
  return { path: p, raw, version, sections };
}

export function requireContractVersion(expected: string) {
  const c = loadRuntimeContract();
  if (!c.version) {
    throw new Error(`Runtime contract at ${c.path} has no parsable version`);
  }
  if (c.version !== expected) {
    throw new Error(`Runtime contract version mismatch: expected ${expected}, found ${c.version}`);
  }
  return c;
}

export default { loadRuntimeContract, requireContractVersion };
