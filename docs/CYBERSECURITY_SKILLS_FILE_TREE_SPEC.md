---
title: Cybersecurity Skills Integration — File Tree Specification
version: 1.0.0
date: 2026-06-07
status: LOCKED
---

# CYBERSECURITY SKILLS FILE TREE SPECIFICATION

**Purpose:** Define exact file paths, module boundaries, and integration points for Anthropic Cybersecurity Skills (754 skills) into CIC + Rewrite Labs.

**Lock Date:** 2026-06-07 (Phase 23 Day 1, Pre-MemoryStore)

**Sequencing:** Execute AFTER Phase 23.2 MemoryStore completion.

---

## DIRECTORY STRUCTURE

### 1. Knowledge Base Root

```
C:\dev\rewrite-mcp\knowledge\
├── anthropic-cybersecurity-skills/
│   ├── skills/                          # All 754 skills from Anthropic repo
│   │   ├── <domain>/                    # e.g., "web-app-security"
│   │   │   ├── <skill_slug>/
│   │   │   │   ├── SKILL.md             # Frontmatter + workflow
│   │   │   │   ├── references/
│   │   │   │   │   ├── standards.md     # ATT&CK, ATLAS, D3FEND, NIST CSF, AI RMF
│   │   │   │   │   └── workflows.md     # Step-by-step procedures
│   │   │   │   ├── scripts/
│   │   │   │   │   └── *.py             # Runnable helpers
│   │   │   │   └── assets/
│   │   │   │       └── *                # Templates, checklists
│   │   │   └── ...
│   │   └── <other_domains>/
│   │
│   ├── metadata.json                    # Indexing: skill_slug → CybersecuritySkill (see schema below)
│   ├── frameworks.json                  # 5-framework crosswalk (see schema below)
│   ├── domains.json                     # Domain taxonomy + coverage stats
│   ├── README.md                        # Knowledge base overview
│   └── .gitignore                       # Standard Python + Node.js ignores
```

**Note:** The `skills/` directory is a clone/symlink to the Anthropic-Cybersecurity-Skills repo. Only the root-level JSON files are managed by CIC.

---

### 2. CIC Extractor Module

```
C:\dev\rewrite-mcp\projects\cic\ingestion\extractors\
├── CybersecuritySkillExtractor.ts       # Main extractor logic
├── schema/
│   ├── cybersecurity-skill.schema.json  # CybersecuritySkill JSON schema
│   └── governance-mapping.schema.json   # GovernanceMapping schema
├── utils/
│   ├── frontmatter-parser.ts            # YAML frontmatter parsing
│   ├── framework-normalizer.ts          # ATT&CK/ATLAS/D3FEND normalization
│   └── schema-validator.ts              # Validation against schemas
└── tests/
    ├── CybersecuritySkillExtractor.test.ts
    └── fixtures/                        # Sample SKILL.md files for testing
```

---

### 3. Qdrant Collections Definition

```
C:\dev\rewrite-mcp\projects\cic\ingestion\qdrant\
├── collections.config.json              # Qdrant DDL (see schema below)
├── cyber_skills_meta.collection.json    # Metadata-only collection
├── cyber_skills_text.collection.json    # Text embeddings collection
├── migrations/
│   └── 001_create_cyber_skills_collections.ts
└── README.md                            # Qdrant setup guide
```

---

### 4. Governance Registry

```
C:\dev\rewrite-mcp\projects\cic\governance\
├── cybersecurity-registry.ts            # In-memory + Postgres backend
├── db/
│   └── schema/
│       ├── governance_mappings.sql      # GovernanceMapping table
│       ├── policy_bindings.sql          # PolicyBinding table
│       └── framework_coverage.sql       # Coverage aggregation
├── migrations/
│   └── 001_governance_schema.sql
└── tests/
    └── cybersecurity-registry.test.ts
```

---

### 5. Runtime Adapter

```
C:\dev\rewrite-mcp\projects\cic\skills-runtime\
├── adapters/
│   └── CyberSkillRuntimeAdapter.ts      # Wraps CybersecuritySkill → RuntimeSkill
├── loader.ts                            # registerCyberSkills() function
└── tests/
    └── CyberSkillRuntimeAdapter.test.ts
```

---

### 6. Rewrite Labs Integration

```
C:\dev\rewrite-mcp\projects\rl\
├── security-enrichment/
│   ├── SecurityProfileAnalyzer.ts       # Extract security context from site
│   ├── SecuritySkillQuery.ts            # Query cyber_skills_text
│   ├── SecurityRequirementGenerator.ts  # Generate SecurityRequirement[]
│   └── tests/
│       └── security-enrichment.test.ts
├── schemas/
│   └── security-requirement.schema.json # SecurityRequirement type
└── README.md                            # Rewrite Labs security module guide
```

---

## SCHEMAS & INTERFACES

### 1. CybersecuritySkill (TypeScript Interface)

**File:** `C:\dev\rewrite-mcp\projects\cic\ingestion\schema\cybersecurity-skill.schema.json`

```typescript
export interface CybersecuritySkill {
  // Identity
  id: string;                           // UUID; skill_slug from SKILL.md
  title: string;                        // From SKILL.md frontmatter
  description: string;                  // From SKILL.md frontmatter
  
  // Classification
  domain: string;                       // Primary domain (e.g., "Web App Security")
  tags: string[];                       // e.g., ["input-validation", "xss"]
  maturity: "alpha" | "beta" | "stable";
  
  // Framework Mappings
  mitre_attack: string[];               // e.g., ["T1190", "T1566"]
  mitre_atlas: string[];                // ATLAS IDs
  mitre_d3fend: string[];               // D3FEND IDs
  nist_csf: string[];                   // e.g., ["PR.AC-3", "DE.CM-1"]
  nist_ai_rmf: string[];                // e.g., ["GOV-1.1", "MAP-2.3"]
  
  // Workflow Metadata
  preconditions: string[];              // Prerequisites (e.g., "Access to admin dashboard")
  triggers: string[];                   // When to run this skill
  outcomes: string[];                   // What the skill achieves
  
  // Content References
  references: {
    standards_md: string;               // Raw markdown from references/standards.md
    workflows_md: string;               // Raw markdown from references/workflows.md
  };
  
  // Assets
  scripts: string[];                    // Relative paths to scripts/*.py
  assets: string[];                     // Relative paths to assets/*
  
  // Provenance
  source_path: string;                  // Full path to SKILL.md (e.g., "knowledge/anthropic-cybersecurity-skills/skills/web-app-security/input-validation/SKILL.md")
  last_updated: string;                 // ISO8601 timestamp
  
  // Metadata
  version: string;                      // e.g., "1.0.0"
  deprecated: boolean;                  // Flag for deprecated skills
}
```

**JSON Schema Validation:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [
    "id", "title", "description", "domain", "tags", "maturity",
    "mitre_attack", "mitre_atlas", "mitre_d3fend", "nist_csf", "nist_ai_rmf",
    "preconditions", "triggers", "outcomes",
    "references", "scripts", "assets", "source_path"
  ],
  "properties": {
    "id": { "type": "string", "pattern": "^[a-z0-9-]+$" },
    "title": { "type": "string", "minLength": 1, "maxLength": 200 },
    "description": { "type": "string", "minLength": 10, "maxLength": 1000 },
    "domain": { "type": "string" },
    "tags": { "type": "array", "items": { "type": "string" } },
    "maturity": { "enum": ["alpha", "beta", "stable"] },
    "mitre_attack": { "type": "array", "items": { "type": "string", "pattern": "^T[0-9]{4}$" } },
    "mitre_atlas": { "type": "array", "items": { "type": "string" } },
    "mitre_d3fend": { "type": "array", "items": { "type": "string" } },
    "nist_csf": { "type": "array", "items": { "type": "string" } },
    "nist_ai_rmf": { "type": "array", "items": { "type": "string" } },
    "preconditions": { "type": "array", "items": { "type": "string" } },
    "triggers": { "type": "array", "items": { "type": "string" } },
    "outcomes": { "type": "array", "items": { "type": "string" } },
    "references": {
      "type": "object",
      "required": ["standards_md", "workflows_md"],
      "properties": {
        "standards_md": { "type": "string" },
        "workflows_md": { "type": "string" }
      }
    },
    "scripts": { "type": "array", "items": { "type": "string" } },
    "assets": { "type": "array", "items": { "type": "string" } },
    "source_path": { "type": "string" },
    "last_updated": { "type": "string", "format": "date-time" },
    "version": { "type": "string", "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+$" },
    "deprecated": { "type": "boolean" }
  }
}
```

---

### 2. GovernanceMapping

**File:** `C:\dev\rewrite-mcp\projects\cic\ingestion\schema\governance-mapping.schema.json`

```typescript
export interface GovernanceMapping {
  id: string;                           // UUID
  skill_id: string;                     // Foreign key to CybersecuritySkill.id
  
  // Framework Coverage
  mitre_attack: string[];
  mitre_atlas: string[];
  mitre_d3fend: string[];
  nist_csf: string[];
  nist_ai_rmf: string[];
  
  // Domain & Tags
  domains: string[];                    // All applicable domains
  tags: string[];                       // All applicable tags
  
  // Compliance
  colorado_ai_act_aligned: boolean;     // Maps to AI RMF for safe harbor
  
  // Metadata
  created_at: string;                   // ISO8601
  updated_at: string;                   // ISO8601
}
```

---

### 3. SecurityRequirement (for Rewrite Labs)

**File:** `C:\dev\rewrite-mcp\projects\rl\schemas\security-requirement.schema.json`

```typescript
export interface SecurityRequirement {
  skill_id: string;                     // Foreign key to CybersecuritySkill.id
  title: string;                        // Skill title
  domain: string;                       // Skill domain
  
  // Why this applies to the site
  rationale: string;                    // Why this skill is recommended for this site
  risk_level: "low" | "medium" | "high"; // Severity if not addressed
  
  // Implementation guidance
  key_controls: string[];               // Distilled from workflows_md
  estimated_effort_hours: number;       // Time to implement
  
  // Status
  status: "considered" | "implemented" | "not_applicable";
  
  // Metadata
  discovered_at: string;                // ISO8601
  last_updated: string;                 // ISO8601
}
```

---

### 4. Qdrant Collection: cyber_skills_meta

**File:** `C:\dev\rewrite-mcp\projects\cic\ingestion\qdrant\cyber_skills_meta.collection.json`

```json
{
  "collection_name": "cyber_skills_meta",
  "vectors": {
    "size": 0,
    "distance": "Cosine"
  },
  "payload_schema": {
    "id": {
      "type": "keyword",
      "description": "Skill slug (UUID)"
    },
    "title": {
      "type": "keyword"
    },
    "domain": {
      "type": "keyword"
    },
    "tags": {
      "type": "keyword",
      "is_array": true
    },
    "maturity": {
      "type": "keyword"
    },
    "mitre_attack": {
      "type": "keyword",
      "is_array": true,
      "description": "e.g., T1190, T1566"
    },
    "mitre_atlas": {
      "type": "keyword",
      "is_array": true
    },
    "mitre_d3fend": {
      "type": "keyword",
      "is_array": true
    },
    "nist_csf": {
      "type": "keyword",
      "is_array": true,
      "description": "e.g., PR.AC-3, DE.CM-1"
    },
    "nist_ai_rmf": {
      "type": "keyword",
      "is_array": true,
      "description": "e.g., GOV-1.1, MAP-2.3"
    }
  },
  "index_params": {
    "type": "keyword"
  }
}
```

**Use Case:** Filter-heavy queries.

```sql
-- Example: Find all skills in NIST CSF PR.AC category
SELECT * FROM cyber_skills_meta
WHERE nist_csf ILIKE 'PR.AC%'
LIMIT 50;
```

---

### 5. Qdrant Collection: cyber_skills_text

**File:** `C:\dev\rewrite-mcp\projects\cic\ingestion\qdrant\cyber_skills_text.collection.json`

```json
{
  "collection_name": "cyber_skills_text",
  "vectors": {
    "size": 3072,
    "distance": "Cosine"
  },
  "payload_schema": {
    "id": {
      "type": "keyword",
      "description": "Skill slug"
    },
    "title": {
      "type": "keyword"
    },
    "domain": {
      "type": "keyword"
    },
    "tags": {
      "type": "keyword",
      "is_array": true
    },
    "text_kind": {
      "type": "keyword",
      "description": "skill | standards | workflows"
    },
    "source_path": {
      "type": "keyword",
      "description": "Full path to source file"
    },
    "frameworks": {
      "type": "keyword",
      "is_array": true,
      "description": "Union of all framework IDs"
    }
  },
  "index_params": {
    "type": "hnsw"
  }
}
```

**Embedding Strategy:**

For each skill, create 3 documents:

**Document 1 (type="skill"):** Skill card

```
[TITLE]
[DESCRIPTION]

Domain: [domain]
Tags: [comma-separated tags]

Frameworks:
- ATT&CK: [T1190, T1566, ...]
- ATLAS: [...]
- D3FEND: [...]
- NIST CSF: [PR.AC-3, DE.CM-1, ...]
- AI RMF: [GOV-1.1, MAP-2.3, ...]

Preconditions: [preconditions]
Triggers: [triggers]
Outcomes: [outcomes]
```

**Document 2 (type="standards"):** Full text of `references/standards.md`

**Document 3 (type="workflows"):** Full text of `references/workflows.md`

---

## EXTRACTOR IMPLEMENTATION

### File: CybersecuritySkillExtractor.ts

**Location:** `C:\dev\rewrite-mcp\projects\cic\ingestion\extractors\CybersecuritySkillExtractor.ts`

```typescript
import * as fs from "fs";
import * as path from "path";
import YAML from "yaml";

export class CybersecuritySkillExtractor {
  private knowledgeBasePath: string;
  private skillsPath: string;

  constructor(knowledgeBasePath: string = "C:\\dev\\rewrite-mcp\\knowledge\\anthropic-cybersecurity-skills") {
    this.knowledgeBasePath = knowledgeBasePath;
    this.skillsPath = path.join(knowledgeBasePath, "skills");
  }

  /**
   * Discover all skills by globbing skills/*/SKILL.md
   */
  async discoverSkills(): Promise<string[]> {
    const skillPaths: string[] = [];
    const skillsDir = fs.readdirSync(this.skillsPath, { withFileTypes: true });
    
    for (const domain of skillsDir) {
      if (!domain.isDirectory()) continue;
      
      const domainPath = path.join(this.skillsPath, domain.name);
      const skillDirs = fs.readdirSync(domainPath, { withFileTypes: true });
      
      for (const skill of skillDirs) {
        if (!skill.isDirectory()) continue;
        
        const skillMdPath = path.join(domainPath, skill.name, "SKILL.md");
        if (fs.existsSync(skillMdPath)) {
          skillPaths.push(skillMdPath);
        }
      }
    }
    
    return skillPaths;
  }

  /**
   * Parse SKILL.md frontmatter into CybersecuritySkill
   */
  async parseSkill(skillMdPath: string): Promise<CybersecuritySkill> {
    const content = fs.readFileSync(skillMdPath, "utf8");
    
    // Split frontmatter
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) {
      throw new Error(`Invalid SKILL.md format: ${skillMdPath}`);
    }
    
    const [, frontmatterText, body] = match;
    const frontmatter = YAML.parse(frontmatterText);
    
    // Build ID from path
    const skillDir = path.basename(path.dirname(skillMdPath));
    const id = skillDir; // Assume dir name is skill_slug
    
    // Load references
    const skillDir_ = path.dirname(skillMdPath);
    const standardsPath = path.join(skillDir_, "references", "standards.md");
    const workflowsPath = path.join(skillDir_, "references", "workflows.md");
    
    const standardsMd = fs.existsSync(standardsPath) 
      ? fs.readFileSync(standardsPath, "utf8") 
      : "";
    const workflowsMd = fs.existsSync(workflowsPath)
      ? fs.readFileSync(workflowsPath, "utf8")
      : "";
    
    // Discover scripts and assets
    const scriptsPath = path.join(skillDir_, "scripts");
    const assetsPath = path.join(skillDir_, "assets");
    
    const scripts = fs.existsSync(scriptsPath)
      ? fs.readdirSync(scriptsPath).map(f => path.join("scripts", f))
      : [];
    const assets = fs.existsSync(assetsPath)
      ? fs.readdirSync(assetsPath).map(f => path.join("assets", f))
      : [];
    
    // Normalize framework IDs
    const mitre_attack = (frontmatter.mitre_attack || [])
      .map((t: string) => t.toUpperCase().trim());
    const mitre_atlas = (frontmatter.mitre_atlas || [])
      .map((t: string) => t.toUpperCase().trim());
    const mitre_d3fend = (frontmatter.mitre_d3fend || [])
      .map((t: string) => t.toUpperCase().trim());
    const nist_csf = (frontmatter.nist_csf || [])
      .map((t: string) => t.toUpperCase().trim());
    const nist_ai_rmf = (frontmatter.nist_ai_rmf || [])
      .map((t: string) => t.toUpperCase().trim());
    
    const skill: CybersecuritySkill = {
      id,
      title: frontmatter.title || "",
      description: frontmatter.description || "",
      domain: frontmatter.domain || "uncategorized",
      tags: frontmatter.tags || [],
      maturity: frontmatter.maturity || "beta",
      mitre_attack,
      mitre_atlas,
      mitre_d3fend,
      nist_csf,
      nist_ai_rmf,
      preconditions: frontmatter.preconditions || [],
      triggers: frontmatter.triggers || [],
      outcomes: frontmatter.outcomes || [],
      references: {
        standards_md: standardsMd,
        workflows_md: workflowsMd,
      },
      scripts,
      assets,
      source_path: skillMdPath,
      last_updated: new Date().toISOString(),
      version: frontmatter.version || "1.0.0",
      deprecated: frontmatter.deprecated || false,
    };
    
    return skill;
  }

  /**
   * Extract all skills and emit CIC events
   */
  async extract(): Promise<CybersecuritySkill[]> {
    const skillPaths = await this.discoverSkills();
    const skills: CybersecuritySkill[] = [];
    
    for (const skillPath of skillPaths) {
      try {
        const skill = await this.parseSkill(skillPath);
        skills.push(skill);
        
        // Emit CIC PIPELINE_RUN event (success)
        console.log(`✓ Extracted: ${skill.id}`);
      } catch (err) {
        console.error(`✗ Failed to extract ${skillPath}:`, err);
        // Emit CIC PIPELINE_RUN event (failure)
      }
    }
    
    return skills;
  }
}

export interface CybersecuritySkill {
  id: string;
  title: string;
  description: string;
  domain: string;
  tags: string[];
  maturity: "alpha" | "beta" | "stable";
  mitre_attack: string[];
  mitre_atlas: string[];
  mitre_d3fend: string[];
  nist_csf: string[];
  nist_ai_rmf: string[];
  preconditions: string[];
  triggers: string[];
  outcomes: string[];
  references: {
    standards_md: string;
    workflows_md: string;
  };
  scripts: string[];
  assets: string[];
  source_path: string;
  last_updated: string;
  version: string;
  deprecated: boolean;
}
```

---

## GOVERNANCE REGISTRY IMPLEMENTATION

### File: cybersecurity-registry.ts

**Location:** `C:\dev\rewrite-mcp\projects\cic\governance\cybersecurity-registry.ts`

```typescript
import { Pool } from "pg";

export class CybersecurityGovernanceRegistry {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  /**
   * Insert GovernanceMapping for a skill
   */
  async registerSkill(mapping: GovernanceMapping): Promise<void> {
    const query = `
      INSERT INTO governance_mappings 
      (id, skill_id, mitre_attack, mitre_atlas, mitre_d3fend, nist_csf, nist_ai_rmf, 
       domains, tags, colorado_ai_act_aligned, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      ON CONFLICT (skill_id) DO UPDATE SET
        mitre_attack = $3,
        mitre_atlas = $4,
        mitre_d3fend = $5,
        nist_csf = $6,
        nist_ai_rmf = $7,
        domains = $8,
        tags = $9,
        colorado_ai_act_aligned = $10,
        updated_at = NOW();
    `;
    
    await this.pool.query(query, [
      mapping.id,
      mapping.skill_id,
      JSON.stringify(mapping.mitre_attack),
      JSON.stringify(mapping.mitre_atlas),
      JSON.stringify(mapping.mitre_d3fend),
      JSON.stringify(mapping.nist_csf),
      JSON.stringify(mapping.nist_ai_rmf),
      JSON.stringify(mapping.domains),
      JSON.stringify(mapping.tags),
      mapping.colorado_ai_act_aligned,
    ]);
  }

  /**
   * Query skills by framework ID (e.g., "PR.AC-3")
   */
  async getSkillsByFramework(frameworkId: string): Promise<GovernanceMapping[]> {
    const query = `
      SELECT * FROM governance_mappings
      WHERE 
        mitre_attack @> $1::jsonb OR
        mitre_atlas @> $1::jsonb OR
        mitre_d3fend @> $1::jsonb OR
        nist_csf @> $1::jsonb OR
        nist_ai_rmf @> $1::jsonb
      ORDER BY updated_at DESC;
    `;
    
    const result = await this.pool.query(query, [JSON.stringify([frameworkId])]);
    return result.rows;
  }

  /**
   * Get Colorado AI Act safe harbor coverage
   */
  async getColoradoSafeHarborCoverage(): Promise<{
    total_aligned: number;
    coverage_percent: number;
    skills: GovernanceMapping[];
  }> {
    const query = `
      SELECT COUNT(*) as total, 
             SUM(CASE WHEN colorado_ai_act_aligned = true THEN 1 ELSE 0 END) as aligned
      FROM governance_mappings;
    `;
    
    const result = await this.pool.query(query);
    const { total, aligned } = result.rows[0];
    
    const skillsQuery = `
      SELECT * FROM governance_mappings
      WHERE colorado_ai_act_aligned = true
      ORDER BY updated_at DESC;
    `;
    
    const skillsResult = await this.pool.query(skillsQuery);
    
    return {
      total_aligned: parseInt(aligned),
      coverage_percent: total > 0 ? (aligned / total) * 100 : 0,
      skills: skillsResult.rows,
    };
  }
}

export interface GovernanceMapping {
  id: string;
  skill_id: string;
  mitre_attack: string[];
  mitre_atlas: string[];
  mitre_d3fend: string[];
  nist_csf: string[];
  nist_ai_rmf: string[];
  domains: string[];
  tags: string[];
  colorado_ai_act_aligned: boolean;
  created_at?: string;
  updated_at?: string;
}
```

---

## RUNTIME ADAPTER IMPLEMENTATION

### File: CyberSkillRuntimeAdapter.ts

**Location:** `C:\dev\rewrite-mcp\projects\cic\skills-runtime\adapters\CyberSkillRuntimeAdapter.ts`

```typescript
import { CybersecuritySkill } from "../../../ingestion/extractors/CybersecuritySkillExtractor";

export interface RuntimeSkill {
  id: string;
  name: string;
  description: string;
  run(context: any): Promise<any>;
}

export class CyberSkillRuntimeAdapter implements RuntimeSkill {
  private skill: CybersecuritySkill;
  private llmRunner: any; // Injected LLM runner (Claude, etc.)

  constructor(skill: CybersecuritySkill, llmRunner: any) {
    this.skill = skill;
    this.llmRunner = llmRunner;
  }

  get id(): string {
    return this.skill.id;
  }

  get name(): string {
    return this.skill.title;
  }

  get description(): string {
    return this.skill.description;
  }

  /**
   * Execute skill with LLM-guided step execution
   */
  async run(context: any): Promise<SkillExecutionResult> {
    const prompt = `
You are executing a cybersecurity skill with deterministic verification steps.

Skill: ${this.skill.title}
Domain: ${this.skill.domain}
Description: ${this.skill.description}

Frameworks:
- ATT&CK: ${this.skill.mitre_attack.join(", ")}
- ATLAS: ${this.skill.mitre_atlas.join(", ")}
- D3FEND: ${this.skill.mitre_d3fend.join(", ")}
- NIST CSF: ${this.skill.nist_csf.join(", ")}
- AI RMF: ${this.skill.nist_ai_rmf.join(", ")}

Preconditions:
${this.skill.preconditions.map((p) => `- ${p}`).join("\n")}

Workflows:
${this.skill.references.workflows_md}

Context:
${JSON.stringify(context, null, 2)}

Produce:
1. Step-by-step execution plan
2. Concrete commands or checks (where applicable)
3. Verification criteria for each step
4. Expected outcomes
5. Success/failure indicators

Format as JSON with keys: ["plan", "steps", "verification", "outcomes", "success_criteria"]
`;

    const response = await this.llmRunner.call(prompt);
    
    return {
      skill_id: this.skill.id,
      status: "completed",
      execution_result: response,
      timestamp: new Date().toISOString(),
    };
  }
}

export interface SkillExecutionResult {
  skill_id: string;
  status: "completed" | "failed" | "partial";
  execution_result: any;
  timestamp: string;
  error?: string;
}

/**
 * Register all cyber skills into runtime
 */
export function registerCyberSkills(
  skills: CybersecuritySkill[],
  registry: any,
  llmRunner: any,
  options?: { maturityFilter?: string[]; domainFilter?: string[] }
): void {
  let filtered = skills;
  
  if (options?.maturityFilter) {
    filtered = filtered.filter((s) => options.maturityFilter!.includes(s.maturity));
  }
  
  if (options?.domainFilter) {
    filtered = filtered.filter((s) => options.domainFilter!.includes(s.domain));
  }
  
  for (const skill of filtered) {
    const adapter = new CyberSkillRuntimeAdapter(skill, llmRunner);
    registry.register(adapter);
    console.log(`✓ Registered runtime skill: ${skill.id}`);
  }
}
```

---

## REWRITE LABS SECURITY ENRICHMENT

### File: SecurityProfileAnalyzer.ts

**Location:** `C:\dev\rewrite-mcp\projects\rl\security-enrichment\SecurityProfileAnalyzer.ts`

```typescript
export interface SecurityProfile {
  tech_stack: string[];           // e.g., ["Express.js", "PostgreSQL", "React"]
  auth_method: string;            // "OAuth", "JWT", "Session", "None"
  input_surfaces: string[];       // "Forms", "API", "File Upload", etc.
  data_sensitivity: "low" | "medium" | "high"; // Handles PII, payments, etc.
  public_facing: boolean;
  api_exposed: boolean;
}

export class SecurityProfileAnalyzer {
  /**
   * Analyze a site and produce SecurityProfile
   */
  async analyze(siteHtml: string, siteMetadata: any): Promise<SecurityProfile> {
    // Parse tech stack (headers, HTML patterns, etc.)
    const techStack = this.detectTechStack(siteHtml, siteMetadata);
    
    // Detect auth method
    const authMethod = this.detectAuthMethod(siteHtml);
    
    // Identify input surfaces
    const inputSurfaces = this.detectInputSurfaces(siteHtml);
    
    // Assess data sensitivity
    const dataSensitivity = this.assessDataSensitivity(siteHtml, siteMetadata);
    
    return {
      tech_stack: techStack,
      auth_method: authMethod,
      input_surfaces: inputSurfaces,
      data_sensitivity: dataSensitivity,
      public_facing: true,
      api_exposed: inputSurfaces.includes("API"),
    };
  }

  private detectTechStack(html: string, metadata: any): string[] {
    // Simple heuristic detection
    const stack = [];
    if (html.includes("express") || html.includes("node")) stack.push("Node.js");
    if (html.includes("react")) stack.push("React");
    if (html.includes("postgresql")) stack.push("PostgreSQL");
    // ... etc
    return stack;
  }

  private detectAuthMethod(html: string): string {
    if (html.includes("oauth") || html.includes("google")) return "OAuth";
    if (html.includes("jwt")) return "JWT";
    if (html.includes("session")) return "Session";
    return "None";
  }

  private detectInputSurfaces(html: string): string[] {
    const surfaces = [];
    if (html.includes("<form")) surfaces.push("Forms");
    if (html.includes("/api")) surfaces.push("API");
    if (html.includes("file") || html.includes("upload")) surfaces.push("File Upload");
    return surfaces;
  }

  private assessDataSensitivity(html: string, metadata: any): "low" | "medium" | "high" {
    if (html.includes("payment") || html.includes("credit")) return "high";
    if (html.includes("email") || html.includes("user")) return "medium";
    return "low";
  }
}
```

### File: SecuritySkillQuery.ts

**Location:** `C:\dev\rewrite-mcp\projects\rl\security-enrichment\SecuritySkillQuery.ts`

```typescript
import { QdrantClient } from "@qdrant/js-client-rest";

export class SecuritySkillQuery {
  private qdrant: QdrantClient;

  constructor(qdrantUrl: string = "http://localhost:6333") {
    this.qdrant = new QdrantClient({ url: qdrantUrl });
  }

  /**
   * Query cyber_skills_text for relevant skills given security profile
   */
  async querySkillsForProfile(
    profile: SecurityProfile,
    topN: number = 5
  ): Promise<any[]> {
    const query = [
      profile.tech_stack.join(" "),
      profile.auth_method,
      profile.input_surfaces.join(" "),
      profile.data_sensitivity === "high" ? "data protection encryption" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const filter = {
      must: [
        { key: "text_kind", match: { value: "skill" } },
      ],
      should: profile.data_sensitivity === "high"
        ? [{ key: "frameworks", match: { value: "NIST" } }]
        : [],
    };

    // Embed query
    const queryEmbedding = await this.embedText(query);

    // Search Qdrant
    const results = await this.qdrant.search("cyber_skills_text", {
      vector: queryEmbedding,
      limit: topN,
      filter,
    });

    return results.result;
  }

  private async embedText(text: string): Promise<number[]> {
    // Use your embedding model (OpenAI, Claude embeddings, etc.)
    // This is a placeholder
    return new Array(3072).fill(0);
  }
}
```

---

## DATABASE SCHEMA

### File: governance_mappings.sql

**Location:** `C:\dev\rewrite-mcp\projects\cic\governance\db\schema\governance_mappings.sql`

```sql
CREATE TABLE IF NOT EXISTS governance_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id VARCHAR(255) UNIQUE NOT NULL,
  
  mitre_attack JSONB NOT NULL DEFAULT '[]',
  mitre_atlas JSONB NOT NULL DEFAULT '[]',
  mitre_d3fend JSONB NOT NULL DEFAULT '[]',
  nist_csf JSONB NOT NULL DEFAULT '[]',
  nist_ai_rmf JSONB NOT NULL DEFAULT '[]',
  
  domains JSONB NOT NULL DEFAULT '[]',
  tags JSONB NOT NULL DEFAULT '[]',
  
  colorado_ai_act_aligned BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_mitre_attack (mitre_attack USING GIN),
  INDEX idx_nist_csf (nist_csf USING GIN),
  INDEX idx_nist_ai_rmf (nist_ai_rmf USING GIN),
  INDEX idx_colorado (colorado_ai_act_aligned)
);

CREATE TABLE IF NOT EXISTS policy_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id VARCHAR(255) NOT NULL,
  
  framework VARCHAR(50) NOT NULL,
  framework_ids JSONB NOT NULL DEFAULT '[]',
  
  supporting_skills JSONB NOT NULL DEFAULT '[]',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (policy_id, framework),
  INDEX idx_framework (framework),
  INDEX idx_policy (policy_id)
);

CREATE TABLE IF NOT EXISTS framework_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework VARCHAR(50) NOT NULL,
  framework_id VARCHAR(100) NOT NULL,
  
  skill_count INTEGER DEFAULT 0,
  coverage_percent FLOAT DEFAULT 0.0,
  
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (framework, framework_id),
  INDEX idx_coverage (coverage_percent DESC)
);
```

---

## OPERATIONAL GUARANTEES & INVARIANTS

These invariants define what CIC, the Harvester, MemoryStore, Governance Registry, Qdrant, and Runtime **must always guarantee** when integrating the Anthropic Cybersecurity Skills knowledge base.

They prevent drift, enforce determinism, and ensure that Phase 23.2 → Phase 50+ remain stable.

---

## 1. Knowledge Base Invariants

### 1.1 Read-only
`rewrite-mcp/knowledge/anthropic-cybersecurity-skills/` is **immutable** at runtime.

- No writes to skill directories
- No runtime caching inside the directory
- No generated files
- No updates to SKILL.md frontmatter


### 1.2 Deterministic discovery
Skill discovery must always:

- Use glob pattern: `skills/*/SKILL.md`
- Sort results lexicographically
- Produce identical ordering across runs

This ensures reproducible ingestion events and traceability.

---

## 2. Extractor Invariants

### 2.1 Temporal gating
Extractor **must not** emit events before Phase 23.2 MemoryStore is complete.

- Extraction code can be written in Phase 23.1
- Event emission begins in Phase 23.2+


### 2.2 Output determinism
Given identical repo state, `CybersecuritySkillExtractor` must produce:

- Identical JSON output
- Identical skill ordering
- Identical checksums (SHA-256)


### 2.3 Zero side effects
Extractor must not:

- Write files to disk
- Modify the repo
- Touch Qdrant collections
- Touch Postgres tables
- Create temporary files

It only emits structured CIC events.

---

## 3. MemoryStore Invariants (Phase 23.2)

### 3.1 Event immutability
Once a CybersecuritySkill ingestion event is written to MemoryStore:

- It **cannot** be modified
- It **cannot** be deleted
- It can only be superseded by a new event (with updated `new_value`)


### 3.2 Schema conformance
CybersecuritySkillExtractor events must conform exactly to the MLA Spec (lines 1–858).

Event type: `PIPELINE_RUN` with payload:

```json
{
  "pipeline_name": "cybersecurity_skill_ingestion",
  "status": "success | partial | failed",
  "items_processed": 754,
  "items_successful": N,
  "items_failed": M,
  "error_summary": "...",
  "metrics": { "throughput_items_per_second": X, "error_rate_percent": Y }
}
```


### 3.3 Checksum integrity
Every skill ingestion event must include checksums:

- SHA-256 of SKILL.md
- SHA-256 of references/standards.md
- SHA-256 of references/workflows.md

On read, recompute and validate. Mismatch → WARN but continue.

---

## 4. Qdrant Invariants

### 4.1 Dual-collection contract
The system must **always** maintain:

- `cyber_skills_meta` — keyword-only, no vectors
- `cyber_skills_text` — 3072-dim embeddings, Cosine distance

No merging, no collapsing, no schema drift.


### 4.2 Embedding determinism
Embedding generation must be:

- Model-stable (use pinned embedding model version)
- Deterministic across runs
- Version-tagged in metadata

If embedding model changes, CIC must emit an `ARPS_DELTA` event (model upgrade) and trigger re-embedding.


### 4.3 Payload completeness
Every point in `cyber_skills_text` must include:

- `id` — skill slug
- `title` — skill title
- `domain` — primary domain
- `tags` — array of tags
- `frameworks` — union of all framework IDs
- `text_kind` — "skill" | "standards" | "workflows"

No missing fields; use `null` if unknown.

---

## 5. Governance Registry Invariants

### 5.1 Framework coverage completeness
Every skill must map to:

- `mitre_attack[]` — may be empty `[]`
- `mitre_atlas[]` — may be empty `[]`
- `mitre_d3fend[]` — may be empty `[]`
- `nist_csf[]` — may be empty `[]`
- `nist_ai_rmf[]` — may be empty `[]`

If a field is empty, explicitly set to `[]`, not `null`.


### 5.2 Colorado AI Act safe-harbor traceability
Every governance decision must trace back:

```
Policy → Framework ID → Skill ID → Evidence (references/standards.md)
```


### 5.3 No orphan policies
Every `policy_binding` must reference:

- At least one framework ID, AND
- At least one supporting skill ID

No dangling references.

---

## 6. Runtime Adapter Invariants

### 6.1 Deterministic execution
Runtime adapter must:

- Load `workflows_md` from skill
- Parse steps deterministically (same order, always)
- Produce stable execution plans
- Generate reproducible checksums


### 6.2 Maturity enforcement
Only skills with `maturity = "stable"` may execute by default.

- `alpha`, `beta` require explicit opt-in via config
- Default policy: `maturity` in `["stable"]`


### 6.3 Domain filtering
Runtime must support domain-based execution:

- **Include domains:** Execute only these domains
- **Exclude domains:** Skip these domains
- Default: all domains allowed

This prevents accidental execution of irrelevant skills.

---

## 7. Rewrite Labs Integration Invariants

### 7.1 Optionality
Security enrichment module must be:

- Opt-in (via config flag)
- Non-intrusive (no changes to core redesign logic)
- Zero impact if disabled


### 7.2 Deterministic enrichment
Given identical site profile, the enrichment module must:

- Query Qdrant with identical parameters
- Return identical skill rankings
- Generate identical SecurityRequirements


### 7.3 No cross-project coupling
Rewrite Labs security module must NOT:

- Import from `projects/cic/`
- Depend on MemoryStore
- Depend on CIC runtime
- Depend on AMB governance

It only consumes:
- Qdrant (read-only)
- Governance registry (read-only)

---

## 8. Cross-System Invariants

### 8.1 Acyclic dependency graph
Allowed flows:

```text
CIC Ingestion → MemoryStore → Qdrant + Governance Registry
                                ↓
                        Runtime Adapter
                                ↓
                        Skill Execution

Rewrite Labs → Qdrant + Governance Registry (read-only)
```

**No reverse dependencies allowed.**


### 8.2 Versioning
Every component must declare:

- `schema_version` — breaking changes bump major version
- `extractor_version` — implementation version
- `runtime_adapter_version` — adapter contract version
- `embedding_model_version` — model ID + version hash


### 8.3 Reproducibility
Given:

- Same repo state (commit hash)
- Same CIC version
- Same embedding model
- Same governance registry state

The system must produce **identical outputs** across runs.

---

## INTEGRATION CHECKLIST

- [ ] Clone Anthropic-Cybersecurity-Skills repo to `C:\dev\rewrite-mcp\knowledge\anthropic-cybersecurity-skills\`
- [ ] Verify SKILL.md frontmatter format (parse sample skill)
- [ ] Create `CybersecuritySkillExtractor.ts` (see above)
- [ ] Create Qdrant collections (`cyber_skills_meta`, `cyber_skills_text`)
- [ ] Initialize Postgres governance registry
- [ ] Implement `CyberSkillRuntimeAdapter`
- [ ] Implement Rewrite Labs security enrichment hooks
- [ ] Write end-to-end integration tests
- [ ] Generate `metadata.json` index (754 skills)
- [ ] Generate `frameworks.json` crosswalk
- [ ] Populate governance registry (skill → framework mappings)
- [ ] Integrate into CIC Harvester → MemoryStore pipeline (Phase 23.2+)
- [ ] Document operator procedures for querying / managing skills

---

## SIGN-OFF

**Specification Status:** ✅ LOCKED (2026-06-07)

**Locked by:** Claude (Phase 23 Day 1)

**Next Steps:**
1. Phase 23.2 — Implement MemoryStore
2. Phase 23.3 — Implement Memory Harvester
3. **THEN:** Implement CybersecuritySkillExtractor (this spec)

**Changes after this point:** Require version bump (→ 1.1.0 or 2.0.0) and migration plan.
