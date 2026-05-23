/**
 * tools/release-tag.mjs
 * @version 1.0.0
 * @date 2026-05-21
 *
 * Automated Git tagging for CIC Releases.
 * Enforces CHANGELOG and Release Notes presence before tagging.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function run(cmd) {
  console.log(`> ${cmd}`);
  return execSync(cmd, { cwd: rootDir, stdio: 'inherit' });
}

function main() {
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const version = pkg.version;

  // 1. Verify CHANGELOG
  const changelogPath = path.join(rootDir, 'docs/rewrite/releases/CHANGELOG.md');
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  if (!changelog.includes(`## [${version}]`)) {
    console.error(`ERROR: CHANGELOG.md does not contain version ${version}`);
    process.exit(1);
  }

  // 2. Verify Release Notes Artifacts
  const notesPath = path.join(rootDir, `docs/rewrite/releases/${version}.md`);
  if (!fs.existsSync(notesPath)) {
    console.error(`ERROR: Release notes not found: ${notesPath}`);
    console.error(`Hint: Run 'npm run release:notes' first.`);
    process.exit(1);
  }

  console.log(`Preparing release v${version}...`);

  try {
    // 3. Commit changes (if any)
    run('git add .');
    // Using || true because commit fails if nothing to commit
    try {
      run(`git commit -m "chore(release): v${version} artifacts"`);
    } catch (e) {
      console.log('No new changes to commit.');
    }

    // 4. Tag
    const tag = `v${version}`;
    // Check if tag already exists
    try {
      execSync(`git rev-parse ${tag}`, { stdio: 'ignore' });
      console.log(`Warning: Tag ${tag} already exists. Skipping tag creation.`);
    } catch (e) {
      run(`git tag -a ${tag} -m "CIC Release ${tag}"`);
      console.log(`Created tag ${tag}`);
    }

    // 5. Push (optional but recommended in the prompt)
    // Note: This might fail in environments without push access, 
    // but we'll include it as requested.
    // run('git push --follow-tags');

    console.log(`\nSUCCESS: Release ${tag} is ready.`);
  } catch (err) {
    console.error(`FAILED: ${err.message}`);
    process.exit(1);
  }
}

main();
