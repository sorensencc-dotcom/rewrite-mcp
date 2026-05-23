/**
 * tools/release-bundle.mjs
 * @version 1.0.0
 * @date 2026-05-21
 *
 * Creates a portable .tar.gz bundle for the current CIC Release.
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

  const bundleName = `rewrite-mcp-release-v${version}.tar.gz`;
  const outputDir = path.join(rootDir, 'docs/rewrite/releases');
  const bundlePath = path.join(outputDir, bundleName);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Building release bundle: ${bundleName} in ${outputDir}...`);

  // Define files to include
  const files = [
    `docs/rewrite/releases/${version}.md`,
    `docs/rewrite/releases/${version}.summary.txt`,
    `docs/rewrite/releases/CHANGELOG.md`,
    `docs/rewrite/REWRITE_LABS_DEV_ROADMAP.md`,
    `docs/rewrite/governance/DOC_POLICY.md`,
    `ANTIGRAVITY.md`,
    `skills`,
    `package.json`,
    `mkdocs.yml`
  ];

  // Filter out missing files to avoid tar errors
  const existingFiles = files.filter(f => {
    const p = path.join(rootDir, f);
    const exists = fs.existsSync(p);
    if (!exists) console.warn(`Warning: Missing file skipped: ${f}`);
    return exists;
  });

  try {
    // Create the bundle (run tar from root but output to docs/rewrite/releases)
    run(`tar -czf ${bundlePath} ${existingFiles.join(' ')}`);
    
    // Calculate SHA256
    const hash = execSync(`sha256sum ${bundlePath}`).toString().split(' ')[0];
    console.log(`\nSUCCESS: Bundle created at ${bundlePath}`);
    console.log(`SHA256: ${hash}`);
    
    // Save checksum to a file in the same directory
    fs.writeFileSync(`${bundlePath}.sha256`, hash);
    console.log(`Checksum saved to ${bundlePath}.sha256`);
    
  } catch (err) {
    console.error(`FAILED: ${err.message}`);
    process.exit(1);
  }
}

main();
