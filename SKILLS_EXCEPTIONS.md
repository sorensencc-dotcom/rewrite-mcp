# Skills Exceptions Registry

When a skill fails policy evaluation but is still valuable as CLI-native, it's registered here with approval.

## Exception Entry Format

```
### Skill: {name}
- **Reason:** {why it's CLI-specific or incompatible with shared library}
- **Approved By:** {reviewer GitHub handle}
- **Date:** {YYYY-MM-DD}
- **Review URL:** {PR or issue link}
- **Sunset Date:** {YYYY-MM-DD or "never"}
```

## Active Exceptions

*(None yet — skills either pass policy or are improved)*

---

## Guidelines

**When to register an exception:**
- Skill is genuinely CLI-native (reads TTY, uses readline, watches files)
- Skill requires platform-specific libraries (terminal colors, spinners, prompts)
- Skill cannot be generalized without losing core value
- Exception is approved by reviewer before merging

**When NOT to register:**
- Skill just needs more tests → add tests and retry
- Skill has poor documentation → improve docs and retry
- Skill has missing schema → fix schema and retry
- Skill could be refactored for reuse → refactor and retry

**Sunset dates:**
- Set a sunset date if you plan to revisit (e.g., "we may generalize this in Q3 2026")
- Sunset date triggers quarterly re-evaluation
- Helps prevent permanent exceptions that could be resolved later
