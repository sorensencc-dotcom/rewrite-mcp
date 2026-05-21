/**
 * tools/release-diff.mjs
 * @version 1.0.0
 * @date 2026-05-21
 *
 * Generates a diff summary between the latest two versions in CHANGELOG.md.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const CHANGELOG_PATH = path.join(REPO_ROOT, 'docs/CHANGELOG.md');
const RELEASES_DIR = path.join(REPO_ROOT, 'docs/releases');

function getVersions() {
  const text = fs.readFileSync(CHANGELOG_PATH, 'utf8');
  const parts = text.split(/^## /m).filter(p => p.trim() && !p.trim().startsWith('# '));
  
  return parts.map(part => {
    const lines = part.split('\n');
    const header = lines[0].trim();
    const versionMatch = header.match(/\[?(\d+\.\d+\.\d+)\]?/);
    const version = versionMatch ? versionMatch[1] : header;
    const body = lines.slice(1).join('\n').trim();
    return { version, body };
  });
}

function countChanges(body) {
  const lines = body.split('\n').map(l => l.trim());
  let added = 0, fixed = 0, changed = 0;
  
  let currentSection = '';
  for (const line of lines) {
    if (line.startsWith('### ')) {
      currentSection = line.toLowerCase();
    } else if (line.startsWith('- ')) {
      if (currentSection.includes('added')) added++;
      else if (currentSection.includes('fixed')) fixed++;
      else if (currentSection.includes('changed')) changed++;
    }
  }
  return { added, fixed, changed, total: added + fixed + changed };
}

function main() {
  try {
    const versions = getVersions();
    if (versions.length < 2) {
      console.log("Not enough versions for a diff.");
      return;
    }

    const v1 = versions[0]; // Latest
    const v2 = versions[1]; // Previous

    const stats1 = countChanges(v1.body);
    const stats2 = countChanges(v2.body);

    const diff = {
      version: v1.version,
      prevVersion: v2.version,
      deltaAdded: stats1.added - stats2.added,
      deltaFixed: stats1.fixed - stats2.fixed,
      deltaTotal: stats1.total - stats2.total,
      v1Stats: stats1,
      v2Stats: stats2
    };

    const diffContent = `# Release Diff: v${v1.version} vs v${v2.version}

## Velocity Delta
- **Total Changes**: ${v1.stats1?.total ?? stats1.total} (Delta: ${diff.deltaTotal >= 0 ? '+' : ''}${diff.deltaTotal})
- **New Features**: ${stats1.added} (Delta: ${diff.deltaAdded >= 0 ? '+' : ''}${diff.deltaAdded})
- **Fixes**: ${stats1.fixed} (Delta: ${diff.deltaFixed >= 0 ? '+' : ''}${diff.deltaFixed})

## Latest Changes (v${v1.version})
${v1.body}

## Previous Changes (v${v2.version})
${v2.body}
`;

    const summary = `v${v1.version} vs v${v2.version}: ${diff.deltaTotal >= 0 ? '+' : ''}${diff.deltaTotal} change velocity delta. ${stats1.added} new features, ${stats1.fixed} fixes.`;

    if (!fs.existsSync(RELEASES_DIR)) {
      fs.mkdirSync(RELEASES_DIR, { recursive: true });
    }

    fs.writeFileSync(path.join(RELEASES_DIR, `diff-${v1.version}.md`), diffContent);
    fs.writeFileSync(path.join(RELEASES_DIR, `diff-${v1.version}.summary.txt`), summary);

    console.log(`Release diff generated: v${v1.version} vs v${v2.version}`);
    console.log(summary);

  } catch (err) {
    console.error("Error generating release diff:", err.message);
    process.exit(1);
  }
}

main();
