# Reverse Image Search

## Overview
The **Reverse Image Search** capability enables CIC to take an input image, generate a perceptual hash, and query external image‑search services to retrieve visually similar assets. It is used by the **Harvester** and **Audit** pipelines to validate that sourced images match expected references.

## Key Functions
- `computeHash(buffer: Buffer): string` – Generates a perceptual hash (pHash).
- `searchSimilar(hash: string, limit?: number): Promise<ImageResult[]>` – Calls the configured image‑search provider (e.g., Google Vision, Bing) and returns a list of matching URLs with confidence scores.

## Integration Points
- **Harvester Image Analyzer** – Uses this module to verify harvested images.
- **CIC Audit Process** – Stores search results as part of the evidence ledger.

## Usage Example
```js
import { reverseImageSearch } from '../../extractors/reverseImageSearchExtractor';

const imgBuffer = await fs.promises.readFile('data/images/sample.png');
const results = await reverseImageSearch(imgBuffer, 5);
console.log(results);
```
---
*Generated on 2026‑06‑07*
