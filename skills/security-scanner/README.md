# Security Scanner

## Purpose
Detect security vulnerabilities in code, configuration files, and dependencies.

## Input
- `scanType` (string): code|config|dependencies|all
- `codeDir` (string): Directory to scan
- `rules` (array): Security rules to apply
- `severity` (string): Filter by high|medium|low|all

## Output
- `scanId` (string): Unique scan identifier
- `timestamp` (string): Scan timestamp
- `findings` (array): Array of vulnerabilities found
- `summary` (object): Count by severity

## Example
```javascript
await skill.invoke('security-scanner', {
  scanType: 'code',
  codeDir: '/project/src',
  severity: 'high'
})
```
