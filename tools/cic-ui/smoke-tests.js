// File: tools/cic-ui/smoke-tests.js | Date: 2026-05-31 | v1.0.0
// Description: ESM Node.js Smoke Test Suite for the CIC UI Layer

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

// Terminal color codes
const ESC = '\x1b[';
const colors = {
  reset: `${ESC}0m`,
  green: `${ESC}32m`,
  red: `${ESC}31m`,
  yellow: `${ESC}33m`,
  cyan: `${ESC}36m`,
  bold: `${ESC}1m`,
};

let testsRun = 0;
let testsFailed = 0;

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function assertTest(description, fn) {
  testsRun++;
  console.log(`${colors.cyan}[TEST] ${description}...${colors.reset}`);
  try {
    await fn();
    console.log(`${colors.green}  ✓ PASS${colors.reset}`);
  } catch (err) {
    testsFailed++;
    console.error(`${colors.red}  ✗ FAIL: ${err.message}${colors.reset}`);
  }
}

async function runSuite() {
  console.log(`\n${colors.bold}${colors.cyan}=== Running CIC UI Smoke Test Suite ===${colors.reset}\n`);

  // Test 1: Verify index.html exists
  await assertTest('Verify apps/operator-ui/index.html exists', async () => {
    const htmlPath = path.join(ROOT_DIR, 'apps/operator-ui/index.html');
    const exists = await fileExists(htmlPath);
    assert.strictEqual(exists, true, 'index.html must exist at apps/operator-ui/');
  });

  // Test 2: Verify control-room.html existence & structure
  await assertTest('Verify apps/operator-ui/control-room.html layout structure', async () => {
    const htmlPath = path.join(ROOT_DIR, 'apps/operator-ui/control-room.html');
    const html = await fs.readFile(htmlPath, 'utf8');
    
    assert.match(html, /<body class="cic-shell">/, 'control-room.html must declare cic-shell class on body');
    assert.match(html, /id="metrics-col"/, 'control-room.html must declare metrics-col container');
    assert.match(html, /id="runs-col"/, 'control-room.html must declare runs-col container');
    assert.match(html, /id="pipelines-col"/, 'control-room.html must declare pipelines-col container');
  });

  // Test 3: Verify style tokens exist
  await assertTest('Verify design system css assets availability', async () => {
    const tokensPath = path.join(ROOT_DIR, 'apps/operator-ui/css/tokens.css');
    const colorsPath = path.join(ROOT_DIR, 'apps/operator-ui/css/colors_and_type.css');
    
    const exists1 = await fileExists(tokensPath);
    const exists2 = await fileExists(colorsPath);
    
    assert.strictEqual(exists1, true, 'tokens.css must exist');
    assert.strictEqual(exists2, true, 'colors_and_type.css must exist');
    
    const tokens = await fs.readFile(tokensPath, 'utf8');
    assert.match(tokens, /--space-md/, 'tokens.css must define standard spacers');
  });

  // Test 4: Verify javascript loader and navigation
  await assertTest('Verify control room navigation components loader', async () => {
    const navPath = path.join(ROOT_DIR, 'apps/operator-ui/js/global-nav.js');
    const exists = await fileExists(navPath);
    assert.strictEqual(exists, true, 'global-nav.js must exist');
    
    const navContent = await fs.readFile(navPath, 'utf8');
    assert.match(navContent, /function injectGlobalNav/, 'global-nav.js must implement injectGlobalNav component');
  });

  // Test 5: Verify build directory exists
  await assertTest('Verify local operator-ui mock assets compilation', async () => {
    const assetsDir = path.join(ROOT_DIR, 'apps/operator-ui/assets');
    const exists = await fileExists(assetsDir);
    assert.strictEqual(exists, true, 'operator-ui assets directory must exist');
  });

  console.log(`\n${colors.bold}=== Smoke Test Summary ===${colors.reset}`);
  console.log(`  Total:  ${testsRun}`);
  console.log(`  Passed: ${colors.green}${testsRun - testsFailed}${colors.reset}`);
  console.log(`  Failed: ${testsFailed > 0 ? colors.red : colors.green}${testsFailed}${colors.reset}\n`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Unhandled smoke test error:', err);
  process.exit(1);
});
