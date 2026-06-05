# Autonomous Execution Rules

**When approval given ("yes", "go", "proceed"):**

1. Full autonomy until committed (all writes, tests, fixes, commits)
2. Zero messages until done
3. One final message only: `Batch N complete: X files, Y tests passing`
4. Stop & ask ONLY if: unrecoverable failure, impossible decision, or data loss risk

**Not an exception:** test failures, compile errors, logic bugs (fix code)

---

Last Updated: 2026-06-05
