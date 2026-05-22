#!/usr/bin/env node

/**
 * Doc Drift Check
 * Detects when code changes occur without corresponding documentation updates.
 * 
 * Rules:
 * 1. Version Drift: If projects/cic/ or apps/ change, CHANGELOG.md must have an entry for the version in package.json.
 * 2. Subsystem Drift: If a subsystem changes, the latest changelog entry must mention it.
 * 3. Policy Drift: If DOC_POLICY.md changes, the changelog must mention it.
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Configuration
const REPO_ROOT = path.resolve(__dirname, '..');
const CHANGELOG_PATH = path.join(REPO_ROOT, 'docs/CHANGELOG.md');
const PKG_PATH        = path.join(REPO_ROOT, 'package.json');
const DOC_POLICY_PATH = path.join(REPO_ROOT, 'docs/DOC_POLICY.md');
const DOC_STATE_PATH  = path.join(REPO_ROOT, 'docs/DOC_STATE.json');

function getChangedFiles() {
  // Priority 1: Command line arguments
  if (process.argv.length > 2) {
    return process.argv.slice(2);
  }

  // Priority 2: Git diff
  try {
    const diff = execSync('git diff --name-only HEAD', { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const untracked = execSync('git ls-files --others --exclude-standard', { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    return [...new Set([...diff.split('\n'), ...untracked.split('\n')])].filter(Boolean);
  } catch (e) {
    // If git fails, return empty list
    return [];
  }
}

function fileChanged(pattern, files) {
  return files.some(f => f.startsWith(pattern));
}

function changelogMentions(term) {
  if (!fs.existsSync(CHANGELOG_PATH)) return false;
  const text = fs.readFileSync(CHANGELOG_PATH, 'utf8');
  // Get the latest entry (first one after the main header)
  const sections = text.split('\n## ');
  if (sections.length < 2) return false;
  const latestEntry = sections[1].toLowerCase();

  // Try exact term, term with hyphens instead of spaces, and term without spaces
  const variants = [
    term.toLowerCase(),
    term.toLowerCase().replace(/ /g, '-'),
    term.toLowerCase().replace(/ /g, '_'),
    term.toLowerCase().replace(/ /g, '')
  ];

  return variants.some(v => latestEntry.includes(v));
}

function updateDocState(version) {
  try {
    const changelogText = fs.readFileSync(CHANGELOG_PATH, 'utf8');
    const headLineMatch = changelogText.match(/^## \[[\d.]+\] - \d{4}-\d{2}-\d{2}/m);
    const headLine = headLineMatch ? headLineMatch[0] : `## [${version}]`;
    const entryCount = (changelogText.match(/^## \[/gm) || []).length;

    const existing = fs.existsSync(DOC_STATE_PATH)
      ? JSON.parse(fs.readFileSync(DOC_STATE_PATH, 'utf8'))
      : {};

    const roadmapText = fs.existsSync(path.join(REPO_ROOT, 'docs/ROADMAP.md'))
      ? fs.readFileSync(path.join(REPO_ROOT, 'docs/ROADMAP.md'), 'utf8')
      : '';
    const completedHeadMatch = roadmapText.match(/- \[v[\d.]+\] .+/);
    const completedHead = completedHeadMatch
      ? completedHeadMatch[0].replace(/^- /, '')
      : (existing.roadmap?.completedHead ?? '');
    const activeCount = (roadmapText.match(/^- .+ — started /gm) || []).length;

    const today = new Date().toISOString().slice(0, 10);
    const state = {
      _note: 'Machine-maintained. Updated by skills/doc-update and tools/doc-drift-check.js. Do not hand-edit.',
      version,
      date: today,
      changelog: { headLine, entryCount },
      roadmap: {
        lastUpdated: today,
        completedHead,
        activeCount
      },
      archDocs: existing.archDocs ?? {}
    };

    fs.writeFileSync(DOC_STATE_PATH, JSON.stringify(state, null, 2) + '\n');
    console.log(`[DOC STATE] Updated docs/DOC_STATE.json → v${version}`);
  } catch (e) {
    console.warn(`[DOC STATE] Could not update DOC_STATE.json: ${e.message}`);
  }
}

function runDocDriftCheck() {
  const files = getChangedFiles();
  
  if (files.length === 0 && process.argv.length <= 2) {
    console.log("No changed files detected and no files provided as arguments.");
    console.log("Usage: node tools/doc-drift-check.js [file1 file2 ...]");
    return;
  }

  if (!fs.existsSync(PKG_PATH)) {
    console.error(`Error: package.json not found at ${PKG_PATH}`);
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  const version = pkg.version;

  const errors = [];

  // Rule 1: Version drift
  if (fileChanged("projects/cic/", files) || fileChanged("apps/", files)) {
    const changelogText = fs.readFileSync(CHANGELOG_PATH, 'utf8');
    if (!changelogText.includes(`## [${version}]`)) {
      errors.push(`CHANGELOG.md missing entry for version [${version}] found in package.json`);
    }
  }

  // Rule 2: Subsystem drift
  const subsystems = [
    { path: "apps/control-plane/", name: "Control Plane" },
    { path: "projects/cic/orchestrator/", name: "Orchestrator" },
    { path: "projects/cic/ingestion/", name: "Harvester" },
    { path: "apps/operator-ui/", name: "Operator UI" }
  ];

  for (const sub of subsystems) {
    if (fileChanged(sub.path, files) && !changelogMentions(sub.name)) {
      errors.push(`${sub.name} changed but latest CHANGELOG.md entry does not mention it.`);
    }
  }

  // Rule 3: Policy drift
  if (files.some(f => f.endsWith("DOC_POLICY.md")) && !changelogMentions("Doc Policy")) {
    errors.push("DOC_POLICY.md changed but latest CHANGELOG.md entry does not mention documentation policy updates.");
  }

  if (errors.length) {
    console.error("\x1b[31m[DOC DRIFT DETECTED]\x1b[0m");
    errors.forEach(err => console.error(` - ${err}`));
    process.exit(1);
  } else {
    console.log("\x1b[32m[DOC DRIFT CHECK: OK]\x1b[0m");
    updateDocState(version);
  }
}

runDocDriftCheck();
