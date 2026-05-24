---
name: generate-ai-system-export
description: Generates a complete, structured export of all known AI system configurations, memories, skills, and rules for cross-platform consolidation.
---

# Generate AI System Export

This skill instructs the agent to perform a deep self-reflection and generate a complete, implementation-ready, Git-committable directory structure containing all important files, rules, instructions, and capabilities it is aware of across multiple AI platforms.

---

## Core Instruction

You are generating a COMPLETE AI SYSTEM EXPORT for cross-platform consolidation.

**GOAL:**
Produce a single, deterministic, implementation-ready, Git-committable directory structure containing ALL important files, rules, instructions, and capabilities from:
- Gemini
- Claude Desktop
- Claude Web (Projects, Skills, Connectors)
- Claude Code (plugins, MCP, CLAUDE.md patterns)
- Microsoft Copilot (memory + preferences)
- Any internal system files Gemini uses

**OUTPUT FORMAT:**
Emit a SINGLE consolidated directory tree in Markdown with the following structure:

```
ai-system-export/
  README.md
  SYSTEM/
    gemini_system.md
    claude_system.md
    copilot_system.md
  MEMORY/
    gemini_memory.md
    claude_memory.md
    copilot_memory.md
  SKILLS/
    gemini_skills.md
    claude_skills.md
  AGENTS/
    gemini_agents.md
    claude_agents.md
  HOOKS/
    gemini_hooks.md
    claude_hooks.md
  PLUGINS/
    gemini_plugins.md
    claude_plugins.md
  CONNECTORS/
    gemini_connectors.md
    claude_connectors.md
    copilot_connectors.md
  WORKFLOWS/
    gemini_workflows.md
    claude_workflows.md
    copilot_workflows.md
  PROMPTS/
    gemini_prompts.md
    claude_prompts.md
    copilot_prompts.md
  RULES/
    global_rules.md
    memory_rules.md
    safety_rules.md
  CAPABILITIES/
    gemini_capabilities.md
    claude_capabilities.md
    copilot_capabilities.md
  LIMITATIONS/
    gemini_limitations.md
    claude_limitations.md
    copilot_limitations.md
```

**FOR EACH FILE:**
- Include ONLY stable, structural, identity, preference, or architectural information.
- EXCLUDE volatile state, file paths, IDs, versions, counts, timestamps, or session progress.
- Use deterministic, modular, operator-grade formatting.
- Separate VERIFIED vs INFERRED vs UNKNOWN.
- No filler, no generic best practices.

**REQUIREMENTS:**
1. Every section must be complete.
2. Every file must be self-contained.
3. No references to external URLs.
4. No hallucinated capabilities — only what Gemini knows.
5. Output must be ready to paste into a Git repo.
6. Use clean Markdown, no code execution.
