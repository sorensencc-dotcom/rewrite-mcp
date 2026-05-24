---
name: research-capture
description: After any research session — image batch review, archive search, source analysis, interview notes, or document scan — intelligently routes findings to the right documents. Analyzes what was found, determines which files need updating (project index, research logs, website, treatment, correspondence log, or any other file), drafts the updates, and outputs ready-to-upload files. Use whenever the user says "update the documents," "capture this," "log these findings," "add this to the index," "update the log," or after any session where new facts, archival finds, images, or source attributions have been established. Also triggers when the user shares a batch of images or documents and asks what needs updating. Works for any project — not CIC-specific. If the project context is ambiguous, reads available project files or asks one question to orient.
---

# Research Capture Skill

Converts the findings of any research session into structured document updates, routed to the right files, ready to upload.

---

## Step 1 — Orient

**Get context efficiently. Do not ask redundant questions.**

First, check what's already available:
- Is a project index in context or in project files? Read it.
- Is the conversation itself the source of findings? Extract from it.
- Did the user point to a specific file? Pull it from Drive or project files.

If none of the above orients you sufficiently, ask ONE question:
> "Which project is this for, and where should I find the current document versions — Drive folder, project files, or paste them here?"

Then proceed.

---

## Step 2 — Extract Findings

From the session (conversation, images, documents, search results), extract all findings and classify each:

| Finding Type | Examples |
|---|---|
| **Confirmed fact** | Death date verified, address confirmed, salary corroborated |
| **New archival find** | Document, photo, letter, catalog number identified |
| **Correction** | Existing record wrong, catalog mislabel fixed |
| **Source attribution** | Photo credited, archive located, repository identified |
| **Outreach lead** | New contact, pending inquiry, follow-up needed |
| **Asset note** | Documentary-grade image, licensing path identified |
| **Pending/unresolved** | Item flagged but not yet confirmed |

Be precise. Distinguish confirmed from corroborated from inferred.

---

## Step 3 — Route to Documents

Determine which documents need updating based on findings. Do not update documents that aren't affected.

### Routing Logic

| Finding Type | Target Documents |
|---|---|
| Confirmed facts | Project index (confirmed facts table) |
| Unverified items | Project index (pending/do-not-use table) |
| New archival finds | Research log(s) for the relevant collection |
| Photo/image finds | Photo log or archive page if one exists |
| Corrections to existing records | Whichever log/catalog holds the wrong entry |
| Outreach leads | Project index (outreach table) or correspondence log |
| Asset notes (documentary-grade) | Project index notes; website if publicly relevant |
| Treatment-relevant narrative finds | Flag for treatment-update skill (do not edit treatment here) |
| Website-relevant content | Website copy file |

**For CIC specifically:**
- Kroll archive finds → Kroll log
- MFM photo corrections → MFM photo log
- Confirmed facts → _PROJECT_INDEX confirmed facts table
- New outreach contacts → _PROJECT_INDEX outreach table
- Website asset additions → index.html or archive page

**For other projects:** infer from available files or ask the user to name the target.

---

## Step 4 — Draft Updates

Draft each update in the correct format for its target document.

### Project Index entries

For confirmed facts table, add row:
```
| [Fact] | [Source] | CONFIRMED |
```

For pending/do-not-use table, add row:
```
| [Item] | [Issue] | [Resolution path] |
```

For outreach table, add row:
```
| [Recipient] | [Purpose] | [Status] | [Sent from] |
```

### Research Log entries (Kroll, Later Life, etc.)

Use the existing log format. For Kroll log (landscape .docx, three-column table):
- Column 1: Item number, description, date, source
- Column 2: Content summary / transcription
- Column 3: Status (Verified / Needs Review / Unverified) + research value note

For new logs or logs without established format, use:
```
ITEM: [ID or title]
DATE: [of document/photo, if known]
SOURCE: [collection, archive, catalog number]
DESCRIPTION: [what it is]
CONTENT: [key details]
STATUS: [Verified / Needs Review / Unverified]
RESEARCH VALUE: [why it matters to the project]
```

### Website copy

Only update if a finding:
- Adds a documentable visual asset
- Corrects a published fact
- Adds a new confirmed location, date, or person

Draft the specific line(s) to change. Do not rewrite sections unnecessarily.

---

## Step 5 — Output

For each affected document, produce one of:

**A) Inline draft** (default) — present the new/changed content clearly labeled by target file. Mark each block:
```
--- UPDATE FOR: [filename] ---
[drafted content]
--- END UPDATE ---
```

**B) Full updated file** — if the user asks for a complete file ready to upload, generate it using the appropriate skill:
- `.docx` → read `/mnt/skills/public/docx/SKILL.md` first
- `.html` → read `/mnt/skills/public/frontend-design/SKILL.md` first
- `.md` → write directly

Always use `present_files` after generating any file.

---

## Step 6 — Flag Treatment Implications

If any finding has implications for the treatment (new narrative evidence, corrected timeline, new dramatic beat, new confirmed scene), flag it clearly:

```
TREATMENT FLAG: [brief description of finding and which section it affects]
→ Run treatment-update skill to apply.
```

Do not edit the treatment within this skill.

---

## Efficiency Rules

- Read existing file content before drafting updates — never overwrite confirmed facts or existing entries without checking.
- Batch all updates for a single document into one output block.
- If a finding is ambiguous (could go in multiple logs), note both options and ask the user to confirm routing.
- Never assert unverified facts as confirmed.
- For CIC: apply the confirmed/corroborated/unverified distinction from the project's research standards.

---

## Example Session Flow

```
User: [shares 20 images from Kroll batch]
Claude: [reads project index from context]
Claude: Extracts 6 findings: 2 confirmed facts, 3 Kroll log entries, 1 outreach lead
Claude: Produces:
  --- UPDATE FOR: _PROJECT_INDEX (confirmed facts) ---
  | Rouge Park house, 7601 Spinoza Drive, built 1916 | Facebook/HDAA post | CONFIRMED — needs primary source verification |
  --- END UPDATE ---

  --- UPDATE FOR: Kroll Log ---
  [3 new entries in log format]
  --- END UPDATE ---

  --- UPDATE FOR: _PROJECT_INDEX (outreach) ---
  | Benson Ford Research Center | Acc. 64.167.833 War Bond photos | PENDING | sorensencc@gmail.com |
  --- END UPDATE ---

  TREATMENT FLAG: Chapel photo 80064-2 — two B-24s flying over the Ford chapel at the future Willow Run site, spring 1940. Potential documentary opening image. Affects Act II (The Machine) visual sequence.
  → Run treatment-update skill to apply.
```