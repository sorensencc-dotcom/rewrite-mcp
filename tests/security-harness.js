const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');
const QUARANTINE_DIR = path.join(PROJECT_ROOT, 'quarantine');
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts');

function cleanup() {
  console.log('Cleaning up test environment...');
  const files = fs.readdirSync(QUARANTINE_DIR);
  for (const file of files) {
    if (file !== '.gitkeep') {
      fs.unlinkSync(path.join(QUARANTINE_DIR, file));
    }
  }
}

function runTest() {
  console.log('=== SECURITY TEST HARNESS START ===');
  
  try {
    // 1. Verify Pipeline Setup
    console.log('\nStep 1: Verifying Security Pipeline Setup...');
    execSync(`node ${path.join(SCRIPTS_DIR, 'verify-quarantine.js')}`, { stdio: 'inherit', cwd: PROJECT_ROOT });

    // 2. Test Malware Scanner - Positive Case (No threats)
    console.log('\nStep 2: Testing Scanner with Clean Files...');
    cleanup();
    fs.writeFileSync(path.join(QUARANTINE_DIR, 'safe.txt'), 'This is a safe file.');
    execSync(`node ${path.join(SCRIPTS_DIR, 'run-scanner.js')}`, { stdio: 'inherit', cwd: PROJECT_ROOT });

    // 3. Test Malware Scanner - Negative Case (Threats detected)
    console.log('\nStep 3: Testing Scanner with Malicious Files...');
    fs.writeFileSync(path.join(QUARANTINE_DIR, 'danger.txt'), 'This file contains THREAT_CONFIRMED_001');
    try {
      execSync(`node ${path.join(SCRIPTS_DIR, 'run-scanner.js')}`, { stdio: 'inherit', cwd: PROJECT_ROOT });
      console.error('FAIL: Scanner should have exited with non-zero code for threats.');
      process.exit(1);
    } catch (e) {
      console.log('PASS: Scanner correctly detected threat and exited with error.');
    }

    // 4. Test Husky Secret Protection (Mocking a commit)
    console.log('\nStep 4: Verifying Husky Secret Protection...');
    const secretFile = path.join(PROJECT_ROOT, 'temp-secret.txt');
    fs.writeFileSync(secretFile, 'My secret key: AIzaSyB12345678901234567890123456789012');
    
    console.log('Staging file with secret...');
    execSync('git add temp-secret.txt', { cwd: PROJECT_ROOT });
    
    console.log('Attempting commit (should be blocked)...');
    try {
      // We use --no-gpg-sign to avoid gpg issues in automated tests, 
      // but the pre-commit hook should still run.
      // We use a dummy message.
      execSync('git commit -m "test: this should fail" --no-gpg-sign', { cwd: PROJECT_ROOT });
      console.error('FAIL: Husky should have blocked the commit.');
      // Cleanup before exit
      execSync('git reset temp-secret.txt', { cwd: PROJECT_ROOT });
      fs.unlinkSync(secretFile);
      process.exit(1);
    } catch (e) {
      console.log('PASS: Husky successfully blocked the commit containing a secret.');
    }

    // Cleanup
    console.log('\nFinalizing: Cleaning up test artifacts...');
    execSync('git reset temp-secret.txt', { cwd: PROJECT_ROOT });
    if (fs.existsSync(secretFile)) fs.unlinkSync(secretFile);
    cleanup();

    console.log('\n=== ALL SECURITY TESTS PASSED ===');
    process.exit(0);

  } catch (err) {
    console.error('\n!!! TEST HARNESS FAILED !!!');
    console.error(err);
    process.exit(1);
  }
}

runTest();
