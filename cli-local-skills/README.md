# Idea Inbox Harvester (Phase 45.6)

Harvest findings into idea store with deduplication and CKG integration.

## Purpose

Converts assessed findings into managed ideas with deduplication, prioritization, and CKG storage.

## Input

- `findings`: Array of assessed findings to harvest
- `context`: Optional metadata (source, tags, executionId)
- `deduplicateMode`: "off" | "exact" | "semantic" (default: semantic)
- `priorityThreshold`: Score threshold for inbox vs archive (default: 0.6)
- `storeInCKG`: Whether to store in Contextual Knowledge Graph (default: true)

## Output

```json
{
  "success": true,
  "harvestId": "harvest-...",
  "ideas": [
    {
      "id": "idea-...",
      "title": "...",
      "score": 0.85,
      "status": "inbox",
      "metadata": {...}
    }
  ],
  "stats": {
    "inboxCount": 5,
    "archiveCount": 2,
    "deduplication": {...}
  }
}
```

## Example

```javascript
const result = await ideaInboxHarvester({
  findings: [assessedFinding],
  context: { source: "phase-45", tags: ["critical"] },
  deduplicateMode: "semantic"
});
```

## Error Handling

Validates findings array is present and processes gracefully.

## Policy Compliance

✓ Input validation  
✓ Error handling  
✓ Test coverage (5/5 tests)  
✓ Deduplication strategy
