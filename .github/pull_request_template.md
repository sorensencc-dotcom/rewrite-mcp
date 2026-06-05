## Description

Brief summary of changes.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor/cleanup
- [ ] Documentation
- [ ] New skill (Phase 45+)

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Skills Policy Agent Checklist

**If adding a new skill, complete this section:**

- [ ] Skill passes policy evaluation: `npm run policy:check -- skills/<skill-name>`
- [ ] Schema is complete (type, properties, required, descriptions)
- [ ] Test coverage ≥ 80% (happy path + error cases)
- [ ] README.md includes: Purpose, Inputs, Outputs, Examples
- [ ] No CLI-specific patterns (process.argv, yargs, readline, etc.)
- [ ] No code smells (console.log, hardcoded secrets, undated TODOs)
- [ ] If CLI-native skill: exception requested and approved (link PR review)

**Exception Request** (if needed):
```bash
npm run policy:exceptions -- add \
  --name=<skill-name> \
  --approver=@<reviewer> \
  --reason="<why it's CLI-specific>" \
  --review-url="<this PR url>"
```

## Documentation

- [ ] README.md updated (if applicable)
- [ ] CHANGELOG.md updated
- [ ] API docs updated (if applicable)

## Related Issues

Closes #(issue number)

---

**Pre-commit checks:** All new skills are automatically evaluated by the Skills Policy Agent. If your skill fails evaluation, the commit will be blocked with guidance on how to fix it.
