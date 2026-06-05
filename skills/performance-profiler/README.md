# Performance Profiler

## Purpose
Profile skill execution to identify bottlenecks and performance regressions.

## Input
- `skillName` (string, required): Skill to profile
- `sampleSize` (number, default: 100): Number of samples
- `profiling` (string): execution-time|memory|cpu|all
- `compareBaseline` (boolean, default: true): Compare to baseline
- `generateReport` (boolean, default: true): Generate report

## Output
- `skill` (string): Skill name
- `samples` (number): Number of samples analyzed
- `metrics` (object): Execution, memory, CPU metrics
- `bottlenecks` (array): Performance bottlenecks found
- `vs_baseline` (object): Comparison to baseline

## Example
```javascript
await skill.invoke('performance-profiler', {
  skillName: 'code-analyzer',
  profiling: 'all',
  compareBaseline: true
})
```
