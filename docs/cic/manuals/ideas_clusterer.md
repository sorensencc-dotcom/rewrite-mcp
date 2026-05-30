# 🧠 IDEA CLUSTERER SUBSYSTEM (Operator Manual)

## 1. Purpose
The **Idea Clusterer Subsystem** automatically classifies memos tagged with `#idea` into thematic clusters and stores them in structured notebooks within Joplin. This ensures that brainstorming remains organized and discoverable.

## 2. Architecture
The subsystem operates as an independent consumer on the Ingestion Bus:

- **Router**: Filters for memos with `#idea` tags.
- **Extractor**: Normalizes content and extracts titles (first line/sentence).
- **Clusterer**: Assigns a cluster path (e.g., `cic/autoscale`) based on tags or keywords.
- **Writer**: Creates nested notebooks in Joplin and saves the idea as a note with idempotency.

## 3. Clustering Rules (Deterministic)

### 3.1 Tag-based Clustering (Primary)
The system uses the first two non-primary tags to form a path.
*Example*: `#idea #cic #autoscale` → `Ideas/cic/autoscale`

### 3.2 Keyword-based Fallback (Secondary)
If no domain tags are present, the system scans the content for specific keywords:
- `region` → `cic/regions`
- `autoscale` → `cic/autoscale`
- `orchestrator` → `cic/orchestrator`
- `rewrite` → `rewrite-labs/general`
- `design` → `rewrite-labs/design`
- `fx` → `finance/fx`
- `execution` → `finance/execution`

### 3.3 Default Fallback
If neither tags nor keywords match:
- `misc/general` → `Ideas/misc/general`

## 4. How to Extend

### Adding New Keywords
Update the `KEYWORD_MAP` in `src/ideas/clusterer.js`.

### Modifying the Root Notebook
Change the `rootNotebook` configuration in the `IdeaWriter` constructor (defaults to `Ideas`).

## 5. Testing
Run the unit test suite:
```bash
node --test projects/cic/ingestion/tests/ideas.test.js
```

## 6. Troubleshooting
- **Idea not clustered**: Check if it has the `#idea` tag.
- **Wrong cluster**: Check the tags and keyword order. Tags always take precedence over keywords.
- **Duplicates**: The system uses `memos-source-<id>` tags for idempotency. Ensure these are not removed in Joplin.
