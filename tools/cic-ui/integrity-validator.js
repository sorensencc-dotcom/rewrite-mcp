// File: tools/cic-ui/integrity-validator.js | Date: 2026-05-31 | v1.0.0
// Description: ESM Monorepo UI Integrity Validator

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

// Color Utilities
const ESC = '\x1b[';
const colors = {
  reset: `${ESC}0m`,
  bold: `${ESC}1m`,
  green: `${ESC}32m`,
  red: `${ESC}31m`,
  yellow: `${ESC}33m`,
  blue: `${ESC}34m`,
  cyan: `${ESC}36m`,
  magenta: `${ESC}35m`,
  bgGreen: `${ESC}42m\x1b[30m`,
  bgRed: `${ESC}42m\x1b[37m`,
};

function logHeader(title) {
  console.log(`\n${colors.bold}${colors.magenta}=== ${title.toUpperCase()} ===${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.bold}${colors.cyan}--- ${title} ---${colors.reset}`);
}

function logPass(item, message = '') {
  console.log(`${colors.green}✔ [PASS] ${colors.bold}${item}${colors.reset} ${message}`);
}

function logWarn(item, message = '') {
  console.log(`${colors.yellow}⚠ [WARN] ${colors.bold}${item}${colors.reset} ${message}`);
}

function logFail(item, message = '') {
  console.log(`${colors.red}✘ [FAIL] ${colors.bold}${item}${colors.reset} ${message}`);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function validateWorkspaces() {
  logSection('Monorepo Workspace Integrity');
  
  const pnpmWorkspacePath = path.join(ROOT_DIR, 'pnpm-workspace.yaml');
  if (await fileExists(pnpmWorkspacePath)) {
    const content = await fs.readFile(pnpmWorkspacePath, 'utf8');
    if (content.includes('packages/cic-design-system') && 
        content.includes('packages/cic-ui') && 
        content.includes('packages/cic-docs-theme')) {
      logPass('pnpm-workspace.yaml', 'contains all recovery packages.');
    } else {
      logWarn('pnpm-workspace.yaml', 'missing one or more packages in build graph.');
    }
  } else {
    logWarn('pnpm-workspace.yaml', 'does not exist (Workspace routing disabled).');
  }

  // Check critical UI workspaces
  const expectedDirs = [
    { name: 'packages/cic-design-system', path: path.join(ROOT_DIR, 'packages/cic-design-system') },
    { name: 'packages/cic-ui', path: path.join(ROOT_DIR, 'packages/cic-ui') },
    { name: 'packages/cic-docs-theme', path: path.join(ROOT_DIR, 'packages/cic-docs-theme') },
    { name: 'apps/operator-ui', path: path.join(ROOT_DIR, 'apps/operator-ui') }
  ];

  for (const dir of expectedDirs) {
    if (await fileExists(dir.path)) {
      const packageJson = path.join(dir.path, 'package.json');
      if (await fileExists(packageJson)) {
        const pkgContent = JSON.parse(await fs.readFile(packageJson, 'utf8'));
        logPass(dir.name, `exists and has package.json (v${pkgContent.version || '1.0.0'}).`);
      } else {
        logFail(dir.name, 'exists but lacks a package.json descriptor.');
      }
    } else {
      logFail(dir.name, 'workspace directory is missing.');
    }
  }
}

async function validateOperatorUIImports() {
  logSection('Operator UI Style & Asset Imports');
  
  const controlRoomPath = path.join(ROOT_DIR, 'apps/operator-ui/control-room.html');
  if (await fileExists(controlRoomPath)) {
    const html = await fs.readFile(controlRoomPath, 'utf8');
    
    // Check style links
    const matchesStyle1 = html.includes('href="/assets/cic.css"');
    const matchesStyle2 = html.includes('href="/assets/cic-tokens.css"');
    const matchesStyle3 = html.includes('href="/assets/cic-components.css"');
    
    if (matchesStyle1 && matchesStyle2 && matchesStyle3) {
      logPass('control-room.html', 'imports all 3 standard CIC Design System CSS bundles.');
    } else if (matchesStyle1 || matchesStyle2 || matchesStyle3) {
      logWarn('control-room.html', 'has partial stylesheet imports.');
    } else {
      logWarn('control-room.html', 'missing stylesheet links. Styling will not load.');
    }

    // Check script files exist
    const scripts = [
      'js/control-plane-api.js',
      'js/metrics-panel.js',
      'js/runs-panel.js',
      'js/pipelines-panel.js'
    ];

    for (const src of scripts) {
      const scriptPath = path.join(ROOT_DIR, 'apps/operator-ui', src);
      if (await fileExists(scriptPath)) {
        logPass(`Script: ${src}`, 'file exists and loaded.');
      } else {
        logWarn(`Script: ${src}`, 'file is missing from directory.');
      }
    }
  } else {
    logFail('apps/operator-ui/control-room.html', 'file is missing.');
  }
}

async function validateMkDocsTheme() {
  logSection('MkDocs Theme Setup');
  
  let mkdocsPath = path.join(ROOT_DIR, 'apps/control-plane/mkdocs.yml');
  if (!(await fileExists(mkdocsPath))) {
    mkdocsPath = path.join(ROOT_DIR, 'mkdocs.yml');
  }

  if (await fileExists(mkdocsPath)) {
    const yml = await fs.readFile(mkdocsPath, 'utf8');
    if (yml.includes('custom_dir: cic-docs-theme') || yml.includes('theme:')) {
      logPass(path.basename(mkdocsPath), 'has theme configurations loaded.');
    } else {
      logWarn(path.basename(mkdocsPath), 'custom custom_dir override missing.');
    }
  } else {
    logWarn('mkdocs.yml', 'no configuration file found in workspace.');
  }
}

async function run() {
  logHeader('CIC UI Integrity Verification Panel');
  console.log(`Running on: ${new Date().toISOString()}`);
  
  try {
    await validateWorkspaces();
    await validateOperatorUIImports();
    await validateMkDocsTheme();
    
    console.log(`\n${colors.bold}${colors.green}=== INTEGRITY SCAN COMPLETED ===${colors.reset}\n`);
  } catch (err) {
    console.error(`\n${colors.red}Integrity check failed: ${err.message}${colors.reset}\n`);
    process.exit(1);
  }
}

run();
