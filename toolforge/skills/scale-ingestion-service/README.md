# scale-ingestion-service

Adjust RL ingestion service worker count based on queue backlog.

## Usage

```bash
scale-ingestion-service [target-queue-depth]
```

- `target-queue-depth`: Optional (100-500; default: 100)

## Logic

- Queue > 500 → Scale to 8 workers + alert
- Queue 100-500 → Scale to 4 workers
- Queue < 100 → Scale to 2 workers

## Output

```
Current queue depth: 287
Recommended workers: 4
Scaling from 2 → 4 workers...
✓ Scaled successfully (deployed in 30s)
```
