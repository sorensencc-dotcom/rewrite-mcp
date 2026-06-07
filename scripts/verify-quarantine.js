const fs = require('fs');
const path = require('path');

const QUARANTINE_DIR = path.join(__dirname, '../quarantine');
const SCANNER_SCRIPT = path.join(__dirname, 'run-scanner.js');

function verify() {
  console.log('--- Quarantine Pipeline Verification ---');
  
  const checks = [
    { name: 'Quarantine Directory Exists', check: () => fs.existsSync(QUARANTINE_DIR) },
    { name: 'Scanner Script Exists', check: () => fs.existsSync(SCANNER_SCRIPT) },
    { name: 'Quarantine is Writable', check: () => {
        try {
          const testFile = path.join(QUARANTINE_DIR, '.verify-test');
          fs.writeFileSync(testFile, 'test');
          fs.unlinkSync(testFile);
          return true;
        } catch (e) {
          return false;
        }
    }},
    { name: 'Husky Secret Protection', check: () => {
        const huskyDir = path.join(__dirname, '../.husky');
        const preCommit = path.join(huskyDir, 'pre-commit');
        return fs.existsSync(preCommit);
    }}
  ];

  let allPassed = true;
  for (const item of checks) {
    const passed = item.check();
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${item.name}`);
    if (!passed) allPassed = false;
  }

  if (allPassed) {
    console.log('Verification Successful: All security components are in place.');
    process.exit(0);
  } else {
    console.error('Verification Failed: One or more components are missing or misconfigured.');
    process.exit(1);
  }
}

verify();
