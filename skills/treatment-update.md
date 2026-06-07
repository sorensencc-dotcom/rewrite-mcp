---
name: treatment-update
description: Apply research findings, narrative decisions, new archival evidence, structural revisions, or editorial changes to a documentary treatment. Handles both surgical updates (insert a new archival find into an existing scene) and structural changes (reorder acts, add a new scene, reframe the central argument). Always works from the current version of the treatment — reads it from Drive, project files, or context before making any changes. Drafts changes for review before generating a new versioned file. Use whenever the user says "update the treatment," "add this to the treatment," "revise the treatment," "new scene for the treatment," "this changes the treatment," or when the research-capture skill raises a TREATMENT FLAG. Works for any documentary project.
---

# Treatment Update Skill

Applies changes to a documentary treatment with version discipline, editorial awareness, and structural intelligence.

---

## Step 1 — Get the Current Treatment

**Always read the current version before touching anything.**

Priority order:
1. Is the current treatment already in context (project files, pasted text)? Use it.
2. Is there a Drive ID in the project index? Fetch with `google_drive_fetch`.
3. Ask the user: "Can you paste the treatment or point me to it?"

Note the current version number. The output will be the next version.

---

## Step 2 — Understand the Change

Identify what type of update is needed:

| Type | Description | Scope |
|---|---|---|
| **Archival insert** | New document, photo, or find adds evidence to an existing scene or claim | Surgical — 1–3 sentences in an existing section |
| **Fact correction** | A confirmed fact replaces an unverified or wrong one | Surgical — specific line(s) |
| **New scene** | A new dramatic beat or sequence needs to be added | Structural — new block inserted at correct narrative position |
| **Reframe** | Central argument, character portrait, or thematic emphasis shifts | Structural — may affect multiple sections |
| **Act restructure** | Order of sequences, acts, or scenes changes | Major — full treatment review required |
| **New character/thread** | A person, place, or theme enters the narrative | Moderate — intro block + integration across relevant sections |

If the update type is unclear, ask one question before proceeding.

---

## Step 3 — Apply Editorial Principles

Before drafting any change, internalize the project's editorial standards. For CIC:

- **Central argument:** Sorensen was systematically erased from the history he made.
- **Unifying theme:** He spent his life making powerful things available to everyone.
- **Opening hook:** *"The moving assembly line. The bomber plant that won the war. The Jeep that defined the American road. One man built all three. You've never heard his name."*
- **Resist the easy elegy** — the *Helene* functions as a question, not a conclusion.
- **Clifford's arc** = humanizing cost, not central narrative.
- **Bennett-Sorensen-Edsel triangle** = the dramatic engine; Edsel is a complex counterpart.
- **Confirmed vs. corroborated vs. unverified** — never introduce unverified material as established fact in the treatment.

For other projects: extract editorial principles from the treatment itself (look for stated themes, loglines, structural notes) or ask the user to state them.

---

## Step 4 — Draft the Change

Present the change as a clear before/after or insertion, labeled by section:

```
--- TREATMENT CHANGE: [Section name / Act] ---
TYPE: [Archival insert / New scene / Reframe / etc.]

CURRENT TEXT:
[exact excerpt or "[no existing text — new insertion]"]

PROPOSED TEXT:
[new or revised text]

REASON:
[one sentence: what finding or decision drives this change, and why it belongs here]
--- END CHANGE ---
```

For structural changes affecting multiple sections, list each change block separately.

**Draft tone:** Match the treatment's existing register. Documentary treatments are written in present tense, active voice, with scene-level specificity. Do not introduce hedging language ("perhaps," "possibly") unless the underlying evidence is genuinely uncertain — in which case flag it.

---

## Step 5 — Flag Dependencies

After drafting changes, note any downstream implications:

- Does this change require updating the project index (new confirmed fact, new scene asset)?
- Does it affect the website copy (new confirmed detail that's publicly stated)?
- Does it create a new research task (a claim that now needs verification)?

```
DEPENDENCY FLAG: [what needs to follow from this change]
→ Run research-capture skill / update website / verify [item].
```

---

## Step 6 — Version and Output

After the user approves the draft:

1. Read `/mnt/skills/public/docx/SKILL.md` before generating a .docx file.
2. Apply all approved changes to the full treatment text.
3. Increment the version number (v12 → v13).
4. Generate the new versioned file.
5. Use `present_files` to deliver it.

**Naming convention:** `CastIronCharlie_Treatment_v[N].docx` (or match the project's existing convention).

---

## Efficiency Rules

- Never generate a new file until the user has approved the draft changes.
- Never change the treatment's version number until changes are approved.
- For surgical inserts, show only the affected paragraph — do not requote the entire treatment.
- For structural changes, show the full affected section.
- If two changes interact (e.g., a new scene affects the act break), draft them together and note the interaction.
- If a finding has treatment implications but the user hasn't explicitly asked to update the treatment, raise it as a flag — don't apply it unilaterally.

---

## Example Session Flow

```
User: "The chapel photo — two B-24s flying over Ford's 1940 chapel at the future Willow Run site. Can we add this to the treatment?"

Claude: [reads current treatment v12 from project files]
Claude: This is an archival insert into Act II (The Machine), at the moment of site selection / construction beginning.

--- TREATMENT CHANGE: Act II — The Machine ---
TYPE: Archival insert

CURRENT TEXT:
"River Rouge. Willow Run. The Arsenal of Democracy. Sorensen didn't just manage these places — he conceived them, physically."

PROPOSED TEXT:
"River Rouge. Willow Run. The Arsenal of Democracy. Sorensen didn't just manage these places — he conceived them, physically. In the spring of 1940, Henry Ford erected a small chapel on a ridge overlooking the cornfield that would become Willow Run — a place of worship for the youth camp below. Two years later, B-24 Liberators were flying over it. Photo No. 80064-2 captures both in the same frame: the chapel below, the bombers above, the old world and the new sharing the same sky."

REASON:
Chapel photo 80064-2 (Benson Ford Research Center series) provides a documentary-grade visual that captures the transformation of the Willow Run site with unusual emotional compression. It belongs at the moment the plant is introduced.
--- END CHANGE ---

DEPENDENCY FLAG: Confirm Photo 80064-2 is cleared for use (contact Benson Ford Research Center re: Acc. 64.167.833 series). Add to confirmed assets in project index once cleared.
```