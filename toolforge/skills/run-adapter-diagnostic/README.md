# run-adapter-diagnostic

Check adapter health, latency percentiles, and error rates in real time.

## Usage

```bash
run-adapter-diagnostic [adapter-name] [time-window]
```

- `adapter-name`: Optional (BrowserNavigate, BrowserScreenshot, ModelGenerate, etc.)
- `time-window`: Optional (5m, 1h, 24h; default: 5m)

## Output

- Success rate (target: >99%)
- Latency: p50, p95, p99 (target p95: <100ms)
- Error rate (target: <5%)
- Recent errors (last 10)

## Example

```
run-adapter-diagnostic BrowserNavigate 1h
```

Output:
```
Adapter: BrowserNavigate (1h window)
├─ Success rate: 99.87%
├─ Latency p95: 87ms (✓ green)
├─ Error rate: 0.13%
└─ Top error: TIMEOUT (5 occurrences)
```
