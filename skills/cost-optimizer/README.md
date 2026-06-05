# Cost Optimizer

## Purpose
Track costs, forecast spending trends, suggest optimizations, and generate cost reports.

## Input
- `action` (string, required): analyze|forecast|suggest|report
- `timeRange` (string): Time range "7d", "30d", "90d"
- `groupBy` (string): Group by skill|workflow|provider
- `threshold` (number): Cost threshold for alerts
- `includeForecasts` (boolean, default: true): Include forecast data

## Output
Analyze: `{ period, totalCost, breakdown, trends }`
Forecast: `{ period, forecast { week, month } }`
Suggest: `{ suggestions [] }`

## Example
```javascript
await skill.invoke('cost-optimizer', {
  action: 'analyze',
  timeRange: '30d',
  groupBy: 'skill'
})
```
