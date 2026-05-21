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
  const bundlePath = path.join(rootDir, bundleName);

  console.log(`Building release bundle: ${bundleName}...`);

  // Define files to include
  const files = [
    `docs/releases/${version}.md`,
    `docs/releases/${version}.summary.txt`,
    `docs/CHANGELOG.md`,
    `docs/ROADMAP.md`,
    `docs/DOC_POLICY.md`,
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
    // Create the bundle
    run(`tar -czf ${bundleName} ${existingFiles.join(' ')}`);
    
    // Calculate SHA256
    const hash = execSync(`sha256sum ${bundleName}`, { cwd: rootDir }).toString().split(' ')[0];
    console.log(`\nSUCCESS: Bundle created at ${bundleName}`);
    console.log(`SHA256: ${hash}`);
    
    // Save checksum to a file
    fs.writeFileSync(path.join(rootDir, `${bundleName}.sha256`), hash);
    console.log(`Checksum saved to ${bundleName}.sha256`);
    
  } catch (err) {
    console.error(`FAILED: ${err.message}`);
    process.exit(1);
  }
}

main();
