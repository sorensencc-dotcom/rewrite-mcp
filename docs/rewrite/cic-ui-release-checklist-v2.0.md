# CIC UI Release Checklist v2.0
**Version:** 2.0.0 | **Date:** 2026-05-31 | **Status:** Active

This document outlines the zero-tolerance release gating process for the CIC UI stability layer.

---

## 🛡️ A. Pre-Commit Verification
Ensure the following checks pass before committing changes locally:
- [ ] **Drift Sentinel Scan:**
  ```bash
  npm run cic-ui:sentinel
  ```
- [ ] **Monorepo Integrity Validation:**
  ```bash
  npm run cic-ui:validate
  ```
- [ ] **Smoke Test Suite:**
  ```bash
  npm run cic-ui:smoke
  ```
- [ ] **Golden Master Verification:**
  ```bash
  npm run cic-ui:snapshot
  ```

---

## 🚀 B. Pre-Push Verification
Validate the build graph and baselines before pushing changes upstream:
- [ ] **Workspace Production Build Compilation:**
  ```bash
  pnpm build
  ```
- [ ] **Drift Sentinel Scan:**
  ```bash
  npm run cic-ui:sentinel
  ```
- [ ] **Golden Master Verification:**
  ```bash
  npm run cic-ui:snapshot
  ```

---

## ⚙️ C. CI Pipeline Gates
The continuous integration pipeline automatically enforces the following checks on every branch:
- [ ] **Drift Sentinel Check:** Passes with `PASS` signal and structured JSON logs.
- [ ] **Integrity Validator Scan:** Matches all directory layout constraints.
- [ ] **Smoke Test Execution:** Passes all visual element structure assertions.
- [ ] **Golden Master Snapshot Verification:** Confirms cryptographic hash compliance.
- [ ] **Dashboard Bundle Validation:** Asserts presence and integrity of compiled JS/CSS dashboard assets.
- [ ] **MkDocs Theme Validation:** Asserts presence and compliance of customized directory theme structures.

---

## 📦 D. Production Release Checklist
Run this stage only when tags are ready to be published:
- [ ] **Materialize Golden Master Snapshot:**
  ```bash
  npm run cic-ui:snapshot -- --create
  ```
- [ ] **Register Git Tags:** Create and register new release versions.
- [ ] **Update Hand-off:** Append updates to `HANDOFF.md`.
- [ ] **Sync Pipeline Blueprint:** Verify workspace blueprint and GHA configs.
