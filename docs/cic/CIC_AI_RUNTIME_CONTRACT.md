# **CIC_AI_RUNTIME_CONTRACT.md**

**Cast Iron Charlie — Multi‑Agent Runtime Contract**

**Version:** 1.0.0  
**Status:** ACTIVE  
**Owner:** CIC‑SYSTEM  
**Location (after approval):** `projects/cic/docs/`

---

## **1. Purpose**

This document defines the **CIC‑AI Runtime Contract** — the authoritative specification for how four independent AI‑driven subsystems operate as a single, deterministic intelligence engine:

- **CIC** — Cast Iron Charlie Intelligence Core
- **RTK** — Rewrite Runtime Toolkit
- **RRK‑AI** — Rewrite Research Kernel
- **git‑ai** — Governance & Versioning Layer

This contract governs:

- Roles
- Boundaries
- Data flows
- Execution order
- Failure modes
- Versioning rules

It sits **above** CIC_SYSTEM.md and is referenced by SYSTEM, ROADMAP, and STATE.

---

## **2. System Roles**

### **2.1 CIC — Cast Iron Charlie Intelligence Core**

CIC is the **authoritative system** responsible for:

- Ingestion pipeline
- Extractor chain (ImageAnalyzerV2, ReverseImageSearchExtractor)
- Indexer + Qdrant vector persistence
- Dashboard + Control Plane
- Section Tracking
- SYSTEM / STATE / ROADMAP documents

CIC is the **source of truth** for all intelligence operations.

---

### **2.2 RTK — Rewrite Runtime Toolkit**

RTK is the **execution engine**.

It handles:

- Running CIC ingestion scripts
- Running smoke tests
- Advancing Section Tracking
- Executing local agents
- Terminal‑safe automation
- Deterministic tool harnessing

RTK is the **muscle** of the system.

---

### **2.3 RRK‑AI — Rewrite Research Kernel**

RRK‑AI is the **research intelligence layer**.

It performs:

- Archival reasoning
- Narrative gap analysis
- Cross‑document synthesis
- Treatment alignment
- Generating autonomous research goals
- Feeding Harvester with new targets

RRK‑AI is the **brain** of the research side.

---

### **2.4 git‑ai — Governance & Versioning Layer**

git‑ai is the **compliance officer**.

It handles:

- Commit generation
- Diff summarization
- PR scaffolding
- SYSTEM/STATE/ROADMAP sync checks
- Prompt drift detection
- Schema drift detection
- Section drift detection

git‑ai ensures the repo remains **consistent, versioned, and auditable**.

---

## **3. Runtime Interaction Model**

The CIC‑AI Runtime is a **four‑agent deterministic loop**:

```
RRK‑AI (research intelligence)
    → RTK (execution engine)
        → CIC (ingestion + enrichment + indexing)
            → git‑ai (governance + versioning)
                → back to RRK‑AI (new research goals)
```

Each subsystem has a strict, non‑overlapping responsibility.

---

## **4. Contracts Between Subsystems**

### **4.1 RRK‑AI → RTK Contract**

RRK‑AI may emit:

- `research_goal`
- `gap_fill_goal`
- `archive_target`
- `ingest_target`

RTK must:

- Validate the goal
- Materialize it into CIC ingestion jobs
- Trigger section tracking if required
- Run smoke tests if required

RRK‑AI **never** executes ingestion directly.

---

### **4.2 RTK → CIC Contract**

RTK may call:

- Harvester
- Pipeline
- Extractors
- Indexer
- Smoke tests
- Section Tracking transitions

CIC must:

- Accept jobs
- Run extractors
- Persist vectors
- Update DB
- Update Dashboard
- Update Section Tracking

RTK **never** modifies SYSTEM/STATE/ROADMAP.

---

### **4.3 CIC → git‑ai Contract**

CIC emits:

- SYSTEM deltas
- STATE deltas
- ROADMAP deltas
- Extractor additions
- Pipeline changes
- Section transitions

git‑ai must:

- Generate commit messages
- Generate PR descriptions
- Validate version bumps
- Detect drift
- Enforce governance rules

git‑ai **never** executes ingestion or research.

---

### **4.4 git‑ai → RRK‑AI Contract**

git‑ai may notify RRK‑AI of:

- New research gaps
- New inconsistencies
- New archival leads
- New narrative opportunities

RRK‑AI must convert these into new research goals.

git‑ai **never** generates research.

---

## **5. Data Contracts**

### **5.1 Ingestion Job Contract**

RTK → CIC:

```json
{
  "job_id": "uuid",
  "type": "image | document | reverse_image",
  "source": "path or URL",
  "metadata": { }
}
```

---

### **5.2 Vector Persistence Contract**

CIC → Qdrant:

```json
{
  "id": "fileId",
  "vector": [ ... ],
  "payload": {
    "file_path": "...",
    "extractor": "ImageAnalyzerV2 | ReverseImageSearchExtractor",
    "timestamp": "ISO"
  }
}
```

---

### **5.3 Governance Contract**

CIC → git‑ai:

```json
{
  "system_version": "1.2.1",
  "state_version": "1.3.1",
  "roadmap_version": "2.6.1",
  "changes": [ ... ]
}
```

---

## **6. Section Tracking**

Section Tracking ensures ingestion is:

- deterministic
- resumable
- auditable
- monotonic

Example:

| Section | Description | Status |
|---------|-------------|--------|
| §0.1‑A | Qdrant connectivity | COMPLETE |
| §0.2 | Folder scan | PENDING |
| §0.3 | Job planning | PENDING |
| §0.4 | Job materialization | COMPLETE |

RTK advances sections only after CIC validates them.

---

## **7. Failure Modes**

### **RRK‑AI failure**

RTK rejects malformed goals.

### **RTK failure**

CIC does not advance Section Tracking.

### **CIC failure**

git‑ai flags drift.

### **git‑ai failure**

RRK‑AI pauses goal generation.

---

## **8. Versioning Rules**

- **Major** — structural change
- **Minor** — subsystem addition
- **Patch** — corrections

CIC, RTK, RRK‑AI, and git‑ai must all agree on version boundaries.

---

## **9. Completion Criteria**

The CIC‑AI Runtime is considered **operational** when:

- RRK‑AI can generate research goals
- RTK can execute them
- CIC can ingest them
- git‑ai can govern them
- Section Tracking advances deterministically
- SYSTEM/STATE/ROADMAP remain in sync

You are now at this point.

---

## **10. Document Hierarchy**

```
CIC_AI_RUNTIME_CONTRACT.md   ← top-level orchestration layer
    ↓
CIC_SYSTEM.md                ← internal architecture
    ↓
CIC_MASTER_ROADMAP.md        ← long-horizon planning
    ↓
CIC_PROJECT_STATE.md         ← volatile status
```

---

## **11. Next Steps**

- Generate CIC‑AI Runtime Diagram
- Generate CIC‑AI Runtime Test Suite
- Generate CIC‑AI Runtime Release Notes
- Integrate references into SYSTEM, ROADMAP, and STATE

---
