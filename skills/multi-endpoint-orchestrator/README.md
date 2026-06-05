# Multi-Endpoint Orchestrator

## Purpose
Chain and coordinate skill invocations across multiple services and APIs. Execute endpoints sequentially or in parallel with configurable fallback strategies.

## Input
- `endpoints` (array, required): List of service endpoints to invoke
  - `service` (string): Service identifier
  - `skill` (string): Skill name to invoke
  - `params` (object): Parameters to pass to skill
- `sequentialMode` (boolean, default: true): Execute sequentially vs parallel
- `timeout` (number, default: 60000): Timeout per endpoint in milliseconds
- `fallbackStrategy` (string, default: "skip-failed"): How to handle failures
  - `skip-failed`: Continue on error
  - `retry-3x`: Retry failed endpoints up to 3 times
  - `use-default`: Use defaultValue from endpoint definition

## Output
- `results` (array): Array of endpoint execution results
- `executionTime` (number): Total execution time in milliseconds
- `failureCount` (number): Number of failed endpoints
- `fallbacksApplied` (number): Number of fallback strategies applied
- `successCount` (number): Number of successful executions

## Example
```javascript
await orchestrator.invoke('multi-endpoint-orchestrator', {
  endpoints: [
    { service: 'analyzer', skill: 'code-review', params: { code: '...' } },
    { service: 'security', skill: 'scan-deps', params: {} }
  ],
  sequentialMode: true,
  fallbackStrategy: 'skip-failed'
})
```
