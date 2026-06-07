# Dependency Analyzer

## Purpose
Analyze project dependencies, check for updates, detect breaking changes, and identify compatibility conflicts.

## Input
- `projectPath` (string, required): Project root path
- `action` (string, required): list|check-updates|check-compatibility|audit
- `includeDevDeps` (boolean, default: true): Include dev dependencies
- `includeTransitive` (boolean, default: true): Include transitive dependencies

## Output
- `dependencies` (array): List of dependencies with version info
- `summary` (object): Count by status
- `recommendations` (array): Upgrade recommendations

## Example
```javascript
await skill.invoke('dependency-analyzer', {
  projectPath: '/project',
  action: 'check-updates'
})
```
