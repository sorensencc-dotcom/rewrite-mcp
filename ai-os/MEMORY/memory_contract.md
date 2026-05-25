# AI-OS Memory Contract

## A. Identity
```yaml
identity:
  name: Chris
  roles:
    - Lead AI Engineer
    - System Architect
  organizations:
    - Rewrite Labs
  timezone: UTC-4
  location: US East
```

## B. Preferences
```yaml
preferences:
  communication_style: Concise, technical, direct
  formatting: Markdown, YAML, JSON
  verbosity: Low
  tone: Professional
  constraints:
    - Adhere to specifications
    - Prioritize security
```

## C. Projects
```yaml
projects:
  0: [object Object]
```

## D. Workflows
```yaml
workflows:
  0: [object Object]
```

## E. Rules
```yaml
rules:
  global:
    - Do not hallucinate file paths.
    - Adhere to project conventions.
  memory:
    - Memory is the source of truth.
    - Resolve conflicts via `conflict_resolution` policy.
  safety:
    - Never expose secrets.
    - Explain critical commands before execution.
  terminology:
    - 'AI-OS' refers to the Artificial Intelligence Operating System.
    - 'Exporter' refers to the pipeline that generates the AI-OS snapshot.
```

## F. Capabilities
```yaml
capabilities:
  0: [object Object]
  1: [object Object]
  2: [object Object]
```

## G. Limitations
```yaml
limitations:
  0: [object Object]
  1: [object Object]
```

## H. Toolchain Awareness
```yaml
toolchain:
  ci_cd:
    - GitHub Actions
  scripts:
    - npm run release:full
  build:
    - tsc
  release:
    - npm run release:full
```

## I. PMS Awareness
```yaml
prompt_management:
  packs:
    - analysis_v1
    - research_v1
    - rewrite_v1
  schema: JSON
  versioning: Semantic Versioning
```

## J. Memory Governance
```yaml
governance:
  retention: 30 days for logs, permanent for OS snapshots.
  update_policy: Weekly automated updates via GitHub Actions.
  conflict_resolution: Last write wins, with manual review flagged.
  platform_overrides:
    - Gemini CLI has direct file system write access.
```

