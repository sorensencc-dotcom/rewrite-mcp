# Audit Logger

## Purpose
Centralized audit trail for compliance and debugging. Immutable records with event logging, querying, and retention management.

## Input
- `action` (string, required): log|query|export|retention
- `event` (string, for log): skill-invoked|workflow-executed|config-changed|access-granted
- `actor` (string, for log): User or system actor
- `resource` (string, for log): Resource being acted upon
- `changes` (object, for log): What changed
- `timeRange` (string, for query): Time range like "7d"

## Output
- `auditId` (string): Unique audit log entry ID
- `timestamp` (string): Event timestamp
- `event` (string): Event type
- `actor` (string): Who performed action
- `resource` (string): What was affected

## Example
```javascript
await skill.invoke('audit-logger', {
  action: 'log',
  event: 'skill-invoked',
  actor: 'claude-code',
  resource: 'skill:security-scanner'
})
```
