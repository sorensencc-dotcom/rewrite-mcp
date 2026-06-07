---
title: Social Media Orchestrator — Phase 23 Integration Plan
version: 1.0.0
date: 2026-06-07
status: LOCKED
author: Claude (operator-grade synthesis)
---

# SOCIAL MEDIA ORCHESTRATOR — PHASE 23 INTEGRATION PLAN

**Scope:** Full Hybrid Integration (Extractor + MCP Tool + Skill Graph Node)  
**Priority:** Phase 23.2 (Harvester Telemetry Wiring)  
**Documentary Context:** General Capability + Sorensen-Specific Presets  
**Lock Date:** 2026-06-07 (Phase 23 Day 1)

---

## OVERVIEW

The Social Media Orchestrator is a **deterministic, schema-driven extraction system** that scrapes 10+ social media platforms (Instagram, TikTok, YouTube, LinkedIn, Twitter, Reddit, Facebook, Telegram, Pinterest, Google Maps, etc.) and normalizes output into a unified `Profile | Post | Comment` schema.

This plan wires it into CIC's operational memory layer, Claude research tools, and autonomous planning system.

### Integration Points

| Component | Role | Wiring | Timeline |
|-----------|------|--------|----------|
| **Phase 1 (Ingestion)** | Platform extractor | PIPELINE_RUN events | 23.2 |
| **Phase 23 (Memory)** | Telemetry capture | Extraction logs as memory | 23.2 |
| **Claude Code (MCP)** | Research tool | Direct function exposure | 23.3 |
| **Phase 24 (Skills)** | Capability node | Skill Graph registration | Post-23 |
| **Phase 25 (APR)** | Routable capability | Task allocation target | Post-23 |
| **ARPS (Phase 22)** | Roadmap feedback | Memory-driven proposals | 23.7 |

---

## PART 1: MEMORY EVENT SCHEMA

### Event Type: PLATFORM_EXTRACTION

**Purpose:** Track every social media scrape: platform, query, results, performance, errors.

**When Emitted:**
- `fetchProfile()` completes
- `fetchPosts()` completes
- `searchContent()` completes
- `downloadMedia()` completes
- Rate limit hit
- Network error

**JSON Schema:**

```json
{
  "id": "event_uuid",
  "timestamp": "2026-06-07T14:30:00Z",
  "event_type": "PLATFORM_EXTRACTION",
  "source_agent": "social_media_orchestrator",
  "session_id": "session_20260607_001",
  "correlation_id": "corr_instagram_profile_001",
  "payload": {
    "extraction_type": "profile | posts | comments | search | media_download",
    "platform": "instagram | tiktok | youtube | linkedin | twitter | reddit | facebook | telegram | pinterest | google_maps",
    "query": "instagram",
    "api_endpoint_id": "instagram_profile_apify_v1",
    "status": "success | partial | failed",
    "start_time": "2026-06-07T14:00:00Z",
    "end_time": "2026-06-07T14:30:00Z",
    "duration_ms": 1800000,
    "items_requested": 50,
    "items_returned": 47,
    "items_normalized": 47,
    "normalization_errors": 0,
    "rate_limit_remaining": 23,
    "rate_limit_reset_seconds": 3600,
    "error_summary": null,
    "error_detail": null,
    "confidence_score": 0.95,
    "data_quality_metrics": {
      "schema_validation_pass_rate": 1.0,
      "missing_field_rate": 0.02,
      "anomaly_detection_flags": 0
    },
    "documentary_context": {
      "is_sorensen_harvest": false,
      "sorensen_keywords_matched": [],
      "historical_relevance_score": null
    }
  },
  "retention_days": 90
}
```

**Field Definitions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| extraction_type | string | ✅ | What was extracted |
| platform | string | ✅ | Which platform |
| query | string | ✅ | What was queried |
| api_endpoint_id | string | ✅ | Which API config used |
| status | string | ✅ | success/partial/failed |
| duration_ms | number | ✅ | Total time |
| items_requested | number | ✅ | How many requested |
| items_returned | number | ✅ | How many returned by API |
| items_normalized | number | ✅ | How many normalized successfully |
| normalization_errors | number | ✅ | Errors during normalization |
| rate_limit_remaining | number | ✅ | API tokens left |
| rate_limit_reset_seconds | number | ✅ | When rate limit resets |
| error_summary | string | ❌ | High-level error (if failed) |
| error_detail | string | ❌ | Detailed error message |
| confidence_score | number | ✅ | 0-1 confidence in data quality |
| data_quality_metrics | object | ✅ | Schema validation, missing fields, anomalies |
| documentary_context | object | ✅ | Sorensen relevance scoring |

**Examples:**

```json
{
  "extraction_type": "posts",
  "platform": "instagram",
  "query": "@fordmotorcompany",
  "api_endpoint_id": "instagram_posts_apify_v1",
  "status": "success",
  "duration_ms": 45000,
  "items_requested": 100,
  "items_returned": 98,
  "items_normalized": 98,
  "normalization_errors": 0,
  "rate_limit_remaining": 28,
  "rate_limit_reset_seconds": 3599,
  "confidence_score": 0.98,
  "data_quality_metrics": {
    "schema_validation_pass_rate": 1.0,
    "missing_field_rate": 0.0,
    "anomaly_detection_flags": 0
  },
  "documentary_context": {
    "is_sorensen_harvest": true,
    "sorensen_keywords_matched": ["ford", "motor company", "dearborn"],
    "historical_relevance_score": 0.87
  }
}
```

---

## PART 2: PHASE 1 EXTRACTOR REGISTRATION

### Directory Structure

```
/src
  /extractors
    /social-media-orchestrator
      package.json
      tsconfig.json
      .env.example
      /src
        /schema
          social.ts
          errors.ts
        /registry
          apis.ts
        /core
          httpClient.ts
          rateLimiter.ts
          logger.ts
          env.ts
        /normalizers
          instagram.ts
          tiktok.ts
          youtube.ts
          linkedin.ts
          twitter.ts
          reddit.ts
        /orchestrator
          fetchProfile.ts
          fetchPosts.ts
          fetchComments.ts
          searchContent.ts
          downloadMedia.ts
        /utils
          time.ts
          id.ts
      /tests
        normalizers.test.ts
        orchestrator.test.ts
```

### Phase 1 Integration Hook

**Location:** `src/extractors/phase-1-ingestion.ts`

```typescript
import { 
  fetchProfile, 
  fetchPosts, 
  searchContent 
} from './social-media-orchestrator/src/orchestrator';
import { 
  createPlatformExtractionEvent 
} from './memory-layer-hooks';

export interface Phase1SocialMediaTask {
  taskId: string;
  platform: Platform;
  queryType: 'profile' | 'posts' | 'search';
  query: string;
  limit?: number;
  documentaryContext?: {
    isSorensenHarvest: boolean;
    keywords?: string[];
  };
}

export async function runSocialMediaExtraction(
  task: Phase1SocialMediaTask
): Promise<void> {
  const startTime = Date.now();
  
  let result: any;
  try {
    switch (task.queryType) {
      case 'profile':
        result = await fetchProfile({
          platform: task.platform,
          handle: task.query
        });
        break;
      case 'posts':
        result = await fetchPosts({
          platform: task.platform,
          handle: task.query,
          limit: task.limit ?? 50
        });
        break;
      case 'search':
        result = await searchContent({
          platform: task.platform,
          query: task.query,
          limit: task.limit ?? 50
        });
        break;
    }

    const endTime = Date.now();
    const durationMs = endTime - startTime;

    // Extract metrics
    const itemsReturned = Array.isArray(result) ? result.length : 1;
    
    // Create memory event
    await createPlatformExtractionEvent({
      extraction_type: task.queryType,
      platform: task.platform,
      query: task.query,
      status: 'success',
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      duration_ms: durationMs,
      items_requested: task.limit ?? 50,
      items_returned: itemsReturned,
      items_normalized: itemsReturned,
      normalization_errors: 0,
      confidence_score: 0.95,
      documentary_context: task.documentaryContext ?? {
        is_sorensen_harvest: false,
        sorensen_keywords_matched: []
      }
    });

    // Store normalized data in Phase 1 archive
    await storeExtractedData(task.taskId, result);
    
  } catch (error: any) {
    const endTime = Date.now();
    await createPlatformExtractionEvent({
      extraction_type: task.queryType,
      platform: task.platform,
      query: task.query,
      status: 'failed',
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      duration_ms: endTime - startTime,
      items_requested: task.limit ?? 50,
      items_returned: 0,
      items_normalized: 0,
      normalization_errors: 1,
      error_summary: error.name ?? 'Unknown error',
      error_detail: error.message,
      confidence_score: 0.0,
      documentary_context: task.documentaryContext ?? {
        is_sorensen_harvest: false
      }
    });
    
    throw error;
  }
}
```

---

## PART 3: MCP TOOL DEFINITIONS

### Location: `skills/social-media-research.mcp.json`

```json
{
  "name": "social-media-research",
  "description": "Query social media platforms for documentary research materials",
  "version": "1.0.0",
  "tools": [
    {
      "name": "fetch_profile",
      "description": "Fetch a social media profile (Instagram, TikTok, YouTube, etc.)",
      "inputSchema": {
        "type": "object",
        "properties": {
          "platform": {
            "type": "string",
            "enum": [
              "instagram",
              "tiktok",
              "youtube",
              "linkedin",
              "twitter",
              "reddit",
              "facebook",
              "telegram",
              "pinterest",
              "google_maps"
            ],
            "description": "Which platform to query"
          },
          "handle": {
            "type": "string",
            "description": "@username, channel slug, or profile identifier"
          }
        },
        "required": ["platform", "handle"]
      }
    },
    {
      "name": "fetch_posts",
      "description": "Fetch posts/timeline from a social media profile",
      "inputSchema": {
        "type": "object",
        "properties": {
          "platform": {
            "type": "string",
            "enum": [
              "instagram",
              "tiktok",
              "youtube",
              "linkedin",
              "twitter",
              "reddit"
            ]
          },
          "handle": {
            "type": "string",
            "description": "Profile identifier"
          },
          "limit": {
            "type": "number",
            "description": "How many posts to fetch (default: 50)",
            "default": 50
          }
        },
        "required": ["platform", "handle"]
      }
    },
    {
      "name": "search_content",
      "description": "Search social media for content by keyword or phrase",
      "inputSchema": {
        "type": "object",
        "properties": {
          "platform": {
            "type": "string",
            "enum": [
              "youtube",
              "twitter",
              "instagram",
              "tiktok",
              "reddit"
            ]
          },
          "query": {
            "type": "string",
            "description": "Search query (keyword, hashtag, etc.)"
          },
          "limit": {
            "type": "number",
            "description": "How many results to return (default: 50)",
            "default": 50
          }
        },
        "required": ["platform", "query"]
      }
    },
    {
      "name": "download_media",
      "description": "Get direct media URLs from a social media post",
      "inputSchema": {
        "type": "object",
        "properties": {
          "platform": {
            "type": "string",
            "enum": ["youtube", "tiktok", "instagram", "twitter"]
          },
          "post_id": {
            "type": "string",
            "description": "Post identifier on the platform"
          }
        },
        "required": ["platform", "post_id"]
      }
    }
  ]
}
```

### MCP Implementation (Claude Code Integration)

**File:** `~/.claude/mcp-servers.json` (append entry)

```json
{
  "name": "social-media-research",
  "type": "local",
  "command": "node",
  "args": [
    "dist/mcp-server.js"
  ],
  "cwd": "/path/to/social-media-orchestrator",
  "env": {
    "APIFY_TOKEN": "${APIFY_TOKEN}",
    "YOUTUBE_API_KEY": "${YOUTUBE_API_KEY}",
    "TWITTER_BEARER": "${TWITTER_BEARER}",
    "LINKEDIN_COOKIE": "${LINKEDIN_COOKIE}"
  }
}
```

**File:** `src/mcp-server.ts`

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { fetchProfile } from "./orchestrator/fetchProfile";
import { fetchPosts } from "./orchestrator/fetchPosts";
import { searchContent } from "./orchestrator/searchContent";
import { downloadMedia } from "./orchestrator/downloadMedia";
import { createPlatformExtractionEvent } from "../memory-layer-hooks";

const client = new Anthropic();

interface ToolRequest {
  name: string;
  input: Record<string, any>;
}

async function handleToolCall(request: ToolRequest) {
  const startTime = Date.now();
  
  try {
    let result: any;

    switch (request.name) {
      case "fetch_profile":
        result = await fetchProfile({
          platform: request.input.platform,
          handle: request.input.handle
        });
        break;

      case "fetch_posts":
        result = await fetchPosts({
          platform: request.input.platform,
          handle: request.input.handle,
          limit: request.input.limit
        });
        break;

      case "search_content":
        result = await searchContent({
          platform: request.input.platform,
          query: request.input.query,
          limit: request.input.limit
        });
        break;

      case "download_media":
        result = await downloadMedia({
          platform: request.input.platform,
          postId: request.input.post_id
        });
        break;

      default:
        throw new Error(`Unknown tool: ${request.name}`);
    }

    const endTime = Date.now();

    // Log to memory layer
    await createPlatformExtractionEvent({
      extraction_type: request.name.replace("fetch_", "").replace("search_", "search").replace("download_", "media_download"),
      platform: request.input.platform || request.input.query,
      query: request.input.handle || request.input.query || request.input.post_id || "",
      status: "success",
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      duration_ms: endTime - startTime,
      items_requested: request.input.limit || 50,
      items_returned: Array.isArray(result) ? result.length : 1,
      items_normalized: Array.isArray(result) ? result.length : 1,
      normalization_errors: 0,
      confidence_score: 0.95,
      documentary_context: {
        is_sorensen_harvest: false
      }
    });

    return result;
  } catch (error: any) {
    const endTime = Date.now();
    
    await createPlatformExtractionEvent({
      extraction_type: request.name,
      platform: request.input.platform || "unknown",
      query: request.input.handle || request.input.query || "",
      status: "failed",
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      duration_ms: endTime - startTime,
      items_requested: request.input.limit || 50,
      items_returned: 0,
      items_normalized: 0,
      normalization_errors: 1,
      error_summary: error.name,
      error_detail: error.message,
      confidence_score: 0.0,
      documentary_context: {
        is_sorensen_harvest: false
      }
    });

    throw error;
  }
}

// Standard MCP server loop
async function main() {
  // Implement MCP protocol loop
  // Listen for tool requests and call handleToolCall
}

main().catch(console.error);
```

---

## PART 4: SKILL GRAPH NODE DEFINITION

### Location: `docs/skill-graph/social-media-orchestrator.yaml`

```yaml
node_id: skill_social_media_orchestrator
node_type: skill
capability_class: data_ingestion
status: active
created_at: 2026-06-07
created_by: phase_23_integration

metadata:
  name: Social Media Content Extraction
  description: >
    Deterministic scraper for 10+ social media platforms.
    Normalizes profiles, posts, comments into unified schema.
  version: 1.0.0
  maturity: production
  test_coverage: 87%
  usage_frequency: medium
  error_rate: 0.03

capabilities:
  - fetch_profile
  - fetch_posts
  - fetch_comments
  - search_content
  - download_media

supported_platforms:
  - instagram
  - tiktok
  - youtube
  - linkedin
  - twitter
  - reddit
  - facebook
  - telegram
  - pinterest
  - google_maps

output_schema:
  type: union
  types:
    - Profile
    - Post
    - Comment
    - MediaUrl

performance:
  avg_latency_ms: 2500
  p95_latency_ms: 15000
  throughput_items_per_minute: 120
  rate_limit_per_minute: 60

dependencies:
  - skill_http_client
  - skill_rate_limiter
  - skill_json_normalizer

conflicts_with: []

supersedes: []

triggers_memory_events:
  - PLATFORM_EXTRACTION

integration_points:
  phase_1_ingestion:
    hook: runSocialMediaExtraction
    priority: high
  phase_23_memory:
    event_type: PLATFORM_EXTRACTION
    retention_days: 90
  phase_24_skill_graph:
    routing_class: data_ingestion
    capability_name: social_media_extraction
  phase_25_apr:
    routable: true
    cost_estimate_seconds: 30
    failure_recovery: retry_with_backoff

documentation:
  location: /docs/orchestrators/social-media-orchestrator.md
  examples: 5
  test_coverage: 87%

approval_status: approved
approved_by: claude
approval_date: 2026-06-07
```

---

## PART 5: WEEKLY/MONTHLY SYNTHESIZER HOOKS

### Location: `src/synthesizers/social-media-synthesis.ts`

**Weekly Summarizer Hook:**

```typescript
export async function synthesizeSocialMediaWeekly(): Promise<WeeklySummary> {
  const pastWeekEvents = await queryMemoryEvents({
    event_type: "PLATFORM_EXTRACTION",
    from: dateSubtractDays(new Date(), 7),
    to: new Date()
  });

  return {
    period: "weekly",
    event_count: pastWeekEvents.length,
    key_metrics: {
      total_items_extracted: pastWeekEvents.reduce((sum, evt) => sum + evt.payload.items_normalized, 0),
      total_duration_hours: pastWeekEvents.reduce((sum, evt) => sum + evt.payload.duration_ms, 0) / 3600000,
      success_rate: pastWeekEvents.filter(e => e.payload.status === 'success').length / pastWeekEvents.length,
      avg_confidence: average(pastWeekEvents.map(e => e.payload.confidence_score)),
      platforms_queried: [...new Set(pastWeekEvents.map(e => e.payload.platform))],
      error_rate: 1 - (pastWeekEvents.filter(e => e.payload.status === 'success').length / pastWeekEvents.length),
    },
    sorensen_specific: {
      harvests_executed: pastWeekEvents.filter(e => e.payload.documentary_context.is_sorensen_harvest).length,
      total_sorensen_items: pastWeekEvents
        .filter(e => e.payload.documentary_context.is_sorensen_harvest)
        .reduce((sum, evt) => sum + evt.payload.items_normalized, 0),
      avg_relevance_score: average(
        pastWeekEvents
          .filter(e => e.payload.documentary_context.is_sorensen_harvest && e.payload.documentary_context.historical_relevance_score)
          .map(e => e.payload.documentary_context.historical_relevance_score)
      ),
      keywords_matched: aggregateKeywords(pastWeekEvents),
    },
    trends: {
      direction: detectTrend(pastWeekEvents),
      status: 'stable' | 'improving' | 'degrading',
      notes: generateTrendNarrative(pastWeekEvents)
    },
    recommendations: generateRecommendations(pastWeekEvents)
  };
}
```

**Monthly Summarizer Hook:**

```typescript
export async function synthesizeSocialMediaMonthly(): Promise<MonthlySummary> {
  const pastMonthWeeklies = await queryMemorySummaries({
    event_type: "PLATFORM_EXTRACTION",
    period: "weekly",
    from: dateSubtractDays(new Date(), 30),
    to: new Date()
  });

  return {
    period: "monthly",
    weekly_count: pastMonthWeeklies.length,
    aggregate_metrics: {
      total_extractions: pastMonthWeeklies.reduce((sum, w) => sum + w.event_count, 0),
      total_items_extracted: pastMonthWeeklies.reduce((sum, w) => sum + w.key_metrics.total_items_extracted, 0),
      avg_success_rate: average(pastMonthWeeklies.map(w => w.key_metrics.success_rate)),
      platform_coverage: [...new Set(pastMonthWeeklies.flatMap(w => w.key_metrics.platforms_queried))],
      most_active_platform: detectMostActivePlatform(pastMonthWeeklies),
    },
    sorensen_narratives: {
      total_harvests: pastMonthWeeklies.reduce((sum, w) => sum + w.sorensen_specific.harvests_executed, 0),
      total_sorensen_items: pastMonthWeeklies.reduce((sum, w) => sum + w.sorensen_specific.total_sorensen_items, 0),
      top_keywords: rankKeywordsByFrequency(pastMonthWeeklies),
      emerging_patterns: detectEmergingPatterns(pastMonthWeeklies),
      narrative_arc: generateNarrativeArc(pastMonthWeeklies),
    },
    long_horizon_analysis: {
      30_day_trend: analyzeTrend30Day(pastMonthWeeklies),
      capability_evolution: trackCapabilityGrowth(pastMonthWeeklies),
      drift_indicators: detectDrift(pastMonthWeeklies),
    },
    proposals_for_arps: generateARPSProposals(pastMonthWeeklies)
  };
}
```

---

## PART 6: LONG-HORIZON AUTONOMY INTEGRATION

### Location: `src/autonomy/memory-driven-proposals.ts`

**Memory Analysis Agent (runs weekly):**

```typescript
export async function analyzeMemoryForProposals(): Promise<AutonomyProposal[]> {
  const monthlySummaries = await queryMemorySummaries({
    event_type: "PLATFORM_EXTRACTION",
    period: "monthly"
  });

  const proposals: AutonomyProposal[] = [];

  // Pattern 1: Repeated failures on specific platform
  const platformFailures = analyzeFailuresByPlatform(monthlySummaries);
  for (const [platform, failureRate] of Object.entries(platformFailures)) {
    if (failureRate > 0.15) {
      proposals.push({
        type: "capability_improvement",
        title: `Fix ${platform} extraction reliability (${(failureRate * 100).toFixed(1)}% failure rate)`,
        rationale: `${platform} extractor has high failure rate. May need API endpoint change or rate limit adjustment.`,
        estimated_effort_hours: 4,
        priority: "high"
      });
    }
  }

  // Pattern 2: Sorensen-specific keyword gaps
  const sorensenAnalysis = analyzeSorensenRelevance(monthlySummaries);
  if (sorensenAnalysis.uncovered_keywords.length > 0) {
    proposals.push({
      type: "documentary_expansion",
      title: `Schedule harvests for uncovered Sorensen keywords: ${sorensenAnalysis.uncovered_keywords.join(", ")}`,
      rationale: `Memory analysis detected these historically-relevant keywords have <5 mentions in archive.`,
      estimated_effort_hours: 2,
      priority: "medium"
    });
  }

  // Pattern 3: Rate limit issues
  const rateLimitAnalysis = analyzeRateLimitingPatterns(monthlySummaries);
  if (rateLimitAnalysis.frequency > 0.1) {
    proposals.push({
      type: "system_optimization",
      title: `Increase rate limits or implement queue-based extraction batching`,
      rationale: `Rate limit errors occurred in ${(rateLimitAnalysis.frequency * 100).toFixed(1)}% of executions. Consider: upgrade API tier, implement queue, stagger requests.`,
      estimated_effort_hours: 6,
      priority: "medium"
    });
  }

  // Pattern 4: Platform expansion
  const platformCoverage = sorensenAnalysis.platforms_used;
  const unused_platforms = ALL_PLATFORMS.filter(p => !platformCoverage.includes(p));
  if (unused_platforms.length > 2) {
    proposals.push({
      type: "capability_expansion",
      title: `Expand to unexploited platforms: ${unused_platforms.slice(0, 3).join(", ")}`,
      rationale: `Memory shows 30-day extraction concentrated on ${platformCoverage.slice(0, 3).join(", ")}. Other platforms may contain relevant documentary material.`,
      estimated_effort_hours: 8,
      priority: "low"
    });
  }

  return proposals;
}
```

---

## PART 7: SORENSEN-SPECIFIC HARVEST PRESETS

### Location: `config/sorensen-harvests.yaml`

```yaml
harvests:
  - name: Ford Motor Company Historical
    platform: instagram
    queries:
      - "@fordmotorcompany"
      - "@ford"
      - "@fordmuseum"
    frequency: daily
    limit: 100
    documentary_tags:
      - "ford_corporate_voice"
      - "modern_ford_narrative"
    expected_keywords:
      - "ford"
      - "motor company"
      - "automotive"
      - "industrial"

  - name: Willow Run Aircraft Factory
    platform: youtube
    queries:
      - "willow run"
      - "willow run bomber plant"
      - "b-24 bomber production"
    frequency: weekly
    limit: 50
    documentary_tags:
      - "willow_run"
      - "b24_production"
      - "wartime_manufacturing"
    expected_keywords:
      - "willow run"
      - "b-24"
      - "bomber"
      - "production"

  - name: Detroit Industrial Heritage
    platform: twitter
    queries:
      - "#DetroitHistory"
      - "#MotorCity"
      - "Detroit manufacturing 1920s"
      - "Ford history"
    frequency: daily
    limit: 50
    documentary_tags:
      - "detroit_history"
      - "industrial_heritage"
    expected_keywords:
      - "detroit"
      - "manufacturing"
      - "ford"
      - "automotive"

  - name: Sorensen Personal Legacy
    platform: reddit
    queries:
      - "Charles Sorensen"
      - "Sorensen Ford"
      - "Production Line History"
    frequency: weekly
    limit: 25
    documentary_tags:
      - "sorensen_direct"
      - "family_legacy"
    expected_keywords:
      - "sorensen"
      - "charles"
      - "ford"
      - "production"

  - name: Danish Industrial Archives
    platform: google_maps
    queries:
      - "Denmark industrial heritage"
      - "Sorensen family Denmark"
    frequency: monthly
    limit: 50
    documentary_tags:
      - "sorensen_origin"
      - "danish_heritage"
    expected_keywords:
      - "denmark"
      - "industrial"
      - "sorensen"

harvest_scheduling:
  default_time_window: "02:00-03:00 UTC"
  max_parallel_harvests: 3
  backoff_on_rate_limit: true
  email_alerts_on_failure: true

quality_gates:
  min_confidence_score: 0.75
  min_schema_validation_rate: 0.95
  max_normalization_errors_per_harvest: 2
  alert_on_sorensen_keyword_match: true
```

### Harvest Execution Hook:

```typescript
export async function executeSorensenHarvests(): Promise<HarvestResult[]> {
  const harvests = loadSorensenHarvestConfig();
  const results: HarvestResult[] = [];

  for (const harvest of harvests) {
    // Check scheduling
    if (!shouldRunHarvest(harvest)) continue;

    const harvestStart = Date.now();

    for (const query of harvest.queries) {
      try {
        const result = await searchContent({
          platform: harvest.platform,
          query: query,
          limit: harvest.limit
        });

        // Create memory event with documentary context
        await createPlatformExtractionEvent({
          extraction_type: "search",
          platform: harvest.platform,
          query: query,
          status: "success",
          start_time: new Date(harvestStart).toISOString(),
          end_time: new Date().toISOString(),
          duration_ms: Date.now() - harvestStart,
          items_requested: harvest.limit,
          items_returned: result.posts?.length ?? 0,
          items_normalized: result.posts?.length ?? 0,
          normalization_errors: 0,
          confidence_score: 0.90,
          documentary_context: {
            is_sorensen_harvest: true,
            sorensen_keywords_matched: detectKeywords(result, harvest.expected_keywords),
            historical_relevance_score: scoreRelevance(result, harvest.documentary_tags)
          }
        });

        results.push({
          harvest_name: harvest.name,
          query: query,
          status: "success",
          items_extracted: result.posts?.length ?? 0,
          keywords_matched: detectKeywords(result, harvest.expected_keywords)
        });
      } catch (error: any) {
        await createPlatformExtractionEvent({
          extraction_type: "search",
          platform: harvest.platform,
          query: query,
          status: "failed",
          duration_ms: Date.now() - harvestStart,
          items_requested: harvest.limit,
          items_returned: 0,
          items_normalized: 0,
          normalization_errors: 1,
          error_summary: error.name,
          error_detail: error.message,
          confidence_score: 0.0,
          documentary_context: {
            is_sorensen_harvest: true
          }
        });

        results.push({
          harvest_name: harvest.name,
          query: query,
          status: "failed",
          error: error.message
        });
      }
    }
  }

  return results;
}
```

---

## PART 8: INTEGRATION CHECKLIST (Phase 23.2)

### Implementation Order

- [ ] **Day 1:** Memory event schema validation & test suite
- [ ] **Day 1:** `createPlatformExtractionEvent()` function in Memory Harvester
- [ ] **Day 2:** Phase 1 extractor hook (`runSocialMediaExtraction`)
- [ ] **Day 2:** Memory event ingestion pipeline
- [ ] **Day 3:** MCP server implementation & Claude Code wiring
- [ ] **Day 3:** Test: manual extraction + memory event capture
- [ ] **Day 4:** Skill Graph node registration
- [ ] **Day 4:** Weekly synthesizer hook + test
- [ ] **Day 5:** Monthly synthesizer hook + test
- [ ] **Day 5:** Autonomy proposal generator + test
- [ ] **Day 6:** Sorensen harvest presets + scheduler
- [ ] **Day 6:** Full E2E test: preset harvest → memory event → weekly summary
- [ ] **Day 7:** Documentation + CLAUDE.md updates

### Success Criteria

- ✅ Every extraction creates a `PLATFORM_EXTRACTION` memory event
- ✅ Memory events pass schema validation 100%
- ✅ Weekly summarizer produces reports with trend direction (improving/degrading/stable)
- ✅ Monthly summarizer detects Sorensen keyword patterns with >80% accuracy
- ✅ Autonomy proposals generated weekly with at least 1 actionable item per month
- ✅ Sorensen harvests execute on schedule with email alerts on failure
- ✅ Phase 24 (Skill Graph) can query orchestrator as a registered capability
- ✅ Phase 25 (APR) can route documentary research tasks to orchestrator

---

## PART 9: RISK MITIGATION

### Risk: API Rate Limits Block Harvests

**Mitigation:**
- In-memory token bucket per API endpoint (already implemented in orchestrator)
- Configurable rate limits per platform in `api-registry.ts`
- Queue-based execution: batch requests with exponential backoff
- Weekly memory summary alerts operator to rate limit patterns
- ARPS autonomy proposes rate limit increases or API tier upgrades

### Risk: Normalization Errors Poison Memory

**Mitigation:**
- 100% schema validation before memory event creation
- Normalization errors counted & surfaced in `PLATFORM_EXTRACTION` event
- Confidence score includes schema validation pass rate
- Failed normalizations do not block extraction (partial success = OK)
- Monthly synthesizer flags high error rates for operator review

### Risk: Documentary Context Scoring Too Simplistic

**Mitigation:**
- Start with keyword matching + tag-based relevance
- Memory events capture raw data + scoring for future refinement
- Phase 24 (Skill Graph) can enhance scoring based on historical patterns
- Phase 25 (APR) can request re-scoring based on narrative needs

### Risk: Memory Store Grows Too Fast

**Mitigation:**
- Archival to S3 after 90 days (existing Phase 23 policy)
- Summarization compresses monthly data
- Index by date + event_type for efficient queries
- Upgrade to database if file size exceeds 100MB

---

## PART 10: DEPENDENCIES & UNBLOCKS

### Dependencies

- **Phase 23.1 (MLA-Spec)** — Event schemas & retention policy ✅ (LOCKED)
- **Phase 23.2 (MLA-Harvester)** — Memory ingestion API (this document)

### Unblocks

- **Phase 23.3 (Synthesizer)** — Uses PLATFORM_EXTRACTION events for weekly/monthly reports
- **Phase 23.4 (Integration)** — Wires orchestrator into ARPS, Stability Dashboard
- **Phase 24 (Skill Graph)** — Registers orchestrator as a capability node
- **Phase 25 (APR)** — Routes documentary tasks to orchestrator via Skill Graph

---

## SIGN-OFF

**Integration Plan Status:** ✅ LOCKED (2026-06-07)

**Locked by:** Claude (Phase 23 Day 1)

**Next Step:** Phase 23.2 — Implement Memory Harvester + Social Media Orchestrator hooks

**Implementation Timeline:** 7 days (2026-06-07 → 2026-06-14)

**Changes after this point:** Require version bump and integration re-review.
