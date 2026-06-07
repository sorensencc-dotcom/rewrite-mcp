# rewrite.discovery Spec
# Version: 1.0.0

## Purpose
Crawl a target domain and extract structural metadata to provide a foundation for content extraction and redesign.

## Expected Inputs
- `url`: string (canonical URL of the target)

## Expected Outputs
- `domSnapshot`: string (raw or pruned HTML)
- `framework`: string (detected web framework)
- `designPatterns`: string[] (detected UI patterns)
- `contentBlocks`: number (count of significant text areas)
- `navigation`: string[] (top-level nav items)

## Evolution Triggers
- Significant DOM drift from previous snapshots
- Detection of unknown frameworks
- Layout anomalies in core sections (hero, footer)
