# Security Infrastructure Manual (v2.18.0)

This document outlines the security features implemented to protect the CIC ecosystem, including malware scanning, pipeline verification, and automated secret protection.

## 1. Malware Scanner
**Script:** `scripts/run-scanner.js`

The malware scanner is designed to sweep the `quarantine/` directory for known malicious signatures and potential secret exposures in files.

### Usage
Run the scanner manually from the project root:
```bash
node scripts/run-scanner.js
```

### Behavior
- Scans all files in the `quarantine/` directory.
- Logs results (CLEAN/THREAT) to `quarantine/scan-results.log`.
- Returns exit code `1` if any threats are detected.

## 2. Pipeline Verification
**Script:** `scripts/verify-quarantine.js`

This script verifies that the security infrastructure is correctly configured and operational.

### Usage
```bash
node scripts/verify-quarantine.js
```

### Checks Performed
- Existence of the `quarantine/` directory.
- Availability of the scanner script.
- Write permissions for the quarantine area.
- Status of the Husky pre-commit hook.

## 3. Husky Secret Protection
**Hook:** `.husky/pre-commit`

Automatic protection is enforced at the commit level. Husky intercepts every `git commit` attempt to scan staged changes for sensitive credentials.

### Detected Patterns
- **Google API Keys:** `AIza...`
- **AWS Access Keys:** `AKIA...`

### Resolution
If a commit is blocked:
1. Identify the file and line containing the secret in the error message.
2. Remove the secret or move it to a secure location (e.g., Infisical).
3. Re-stage the file (`git add`) and attempt the commit again.

## 4. Security Test Harness
**Script:** `tests/security-harness.js`

A comprehensive, reusable test suite that validates the entire security plane.

### Usage
```bash
node tests/security-harness.js
```

### Test Stages
1. **Setup Verification:** Runs `verify-quarantine.js`.
2. **Positive Scan:** Confirms clean files pass the scanner.
3. **Negative Scan:** Confirms the scanner identifies and blocks malicious content.
4. **Husky Interception:** Mocks a commit containing a secret to verify the blocking mechanism.

---
*Authored by: Antigravity CLI*  
*Date: 2026-05-22*
