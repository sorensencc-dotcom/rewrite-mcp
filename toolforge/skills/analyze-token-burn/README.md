# analyze-token-burn

Project month-end token costs and identify cost drivers.

## Usage

```bash
analyze-token-burn [mode]
```

- `daily`: Show today's burn rate (default)
- `monthly`: Project month-end spend
- `by-adapter`: Top 5 cost drivers

## Output (monthly mode)

```
Monthly Token Budget: $100 USD (quota based on plan)
Days elapsed: 2 / 30
Tokens used: 1.2M
Projected month-end: $8.50 (8.5% of budget)
Trend: ✓ On pace

Days to 95% budget: ~30 (safe)
```

## Output (by-adapter mode)

```
Top 5 Cost Drivers (today):
1. ModelGenerate: $2.40 (48%)
2. BrowserScreenshot: $1.20 (24%)
3. TorqueQuery: $0.80 (16%)
4. BrowserNavigate: $0.40 (8%)
5. Other: $0.20 (4%)
```
