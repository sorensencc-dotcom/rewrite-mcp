# Living-Document Versioning Policy

- Every markdown document under `docs/` is version‑controlled via Git.
- A **version ledger** file `docs/ledger.json` records:
  - `path`: relative path to the document
  - `version`: semantic version (e.g., 1.2.3)
  - `hash`: SHA‑256 of the file content at that version
  - `author`: git user name
  - `timestamp`: ISO‑8601

## Update Procedure
1. Edit the document.
2. Run `npm run doc:version <relative‑path>`.
3. The script computes the new hash, increments the patch version, and appends an entry to `ledger.json`.
4. Commit both the document and updated `ledger.json` together.
