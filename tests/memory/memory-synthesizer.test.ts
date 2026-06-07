/**
 * Memory Synthesizer Tests
 */

import { MemorySubstrate } from "../../src/memory/memory-substrate";
import { MemoryHarvester } from "../../src/memory/memory-harvester";
import { MemorySynthesizer } from "../../src/memory/memory-synthesizer";
import fs from "fs";

describe("MemorySynthesizer", () => {
  let substrate: MemorySubstrate;
  let harvester: MemoryHarvester;
  let synthesizer: MemorySynthesizer;
  const testStorePath = "./test_synthesizer_store.jsonl";

  beforeEach(() => {
    if (fs.existsSync(testStorePath)) {
      fs.unlinkSync(testStorePath);
    }

    substrate = new MemorySubstrate({ store_path: testStorePath });
    harvester = new MemoryHarvester({
      substrate,
      session_id: "session_20260607_test",
    });
    synthesizer = new MemorySynthesizer(substrate);
  });

  afterEach(() => {
    if (fs.existsSync(testStorePath)) {
      fs.unlinkSync(testStorePath);
    }
  });

  test("should synthesize weekly summary", async () => {
    // Add some extraction events
    for (let i = 0; i < 5; i++) {
      await harvester.harvestPlatformExtraction({
        extraction_type: "posts",
        platform: "instagram",
        query: `query_${i}`,
        api_endpoint_id: "instagram_posts_v1",
        status: "success",
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        duration_ms: 1000,
        items_requested: 50,
        items_returned: 48,
        items_normalized: 48,
        normalization_errors: 0,
        rate_limit_remaining: 30,
        rate_limit_reset_seconds: 3600,
        confidence_score: 0.95,
        data_quality_metrics: {
          schema_validation_pass_rate: 1.0,
          missing_field_rate: 0.02,
          anomaly_detection_flags: 0,
        },
        documentary_context: {
          is_sorensen_harvest: false,
          sorensen_keywords_matched: [],
        },
      });
    }

    const summary = await synthesizer.synthesizeWeekly();

    expect(summary.period).toBe("weekly");
    expect(summary.event_count).toBe(5);
    expect(summary.key_metrics.total_items_extracted).toBe(240);
    expect(summary.trends.direction).toBeDefined();
    expect(summary.recommendations).toHaveLength(1);
  });

  test("should analyze Sorensen harvests in weekly summary", async () => {
    // Add Sorensen-specific extraction
    await harvester.harvestPlatformExtraction({
      extraction_type: "search",
      platform: "youtube",
      query: "willow run",
      api_endpoint_id: "youtube_search_v1",
      status: "success",
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      duration_ms: 2000,
      items_requested: 50,
      items_returned: 45,
      items_normalized: 45,
      normalization_errors: 0,
      rate_limit_remaining: 50,
      rate_limit_reset_seconds: 3600,
      confidence_score: 0.92,
      data_quality_metrics: {
        schema_validation_pass_rate: 0.98,
        missing_field_rate: 0.05,
        anomaly_detection_flags: 0,
      },
      documentary_context: {
        is_sorensen_harvest: true,
        sorensen_keywords_matched: ["willow run", "b-24"],
        historical_relevance_score: 0.88,
      },
    });

    const summary = await synthesizer.synthesizeWeekly();

    expect(summary.sorensen_specific).toBeDefined();
    expect(summary.sorensen_specific!.harvests_executed).toBe(1);
    expect(summary.sorensen_specific!.keywords_matched).toContain("willow run");
  });

  test("should synthesize monthly summary", async () => {
    // Add multiple extraction events
    for (let i = 0; i < 10; i++) {
      await harvester.harvestPlatformExtraction({
        extraction_type: "posts",
        platform: i % 2 === 0 ? "instagram" : "twitter",
        query: `query_${i}`,
        api_endpoint_id: i % 2 === 0 ? "instagram_posts_v1" : "twitter_posts_v1",
        status: i % 10 !== 9 ? "success" : "failed",
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        duration_ms: 1000,
        items_requested: 50,
        items_returned: i % 10 !== 9 ? 48 : 0,
        items_normalized: i % 10 !== 9 ? 48 : 0,
        normalization_errors: 0,
        rate_limit_remaining: 30,
        rate_limit_reset_seconds: 3600,
        confidence_score: 0.95,
        data_quality_metrics: {
          schema_validation_pass_rate: 1.0,
          missing_field_rate: 0.02,
          anomaly_detection_flags: 0,
        },
        documentary_context: {
          is_sorensen_harvest: false,
          sorensen_keywords_matched: [],
        },
      });
    }

    const summary = await synthesizer.synthesizeMonthly();

    expect(summary.period).toBe("monthly");
    expect(summary.aggregate_metrics.total_extractions).toBe(10);
    expect(summary.aggregate_metrics.platform_coverage).toContain("instagram");
    expect(summary.aggregate_metrics.platform_coverage).toContain("twitter");
    expect(summary.proposals_for_arps.length).toBeGreaterThan(0);
  });

  test("should generate ARPS proposals", async () => {
    // Add events with high error rate
    for (let i = 0; i < 5; i++) {
      await harvester.harvestPlatformExtraction({
        extraction_type: "posts",
        platform: "instagram",
        query: `query_${i}`,
        api_endpoint_id: "instagram_posts_v1",
        status: "failed",
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        duration_ms: 1000,
        items_requested: 50,
        items_returned: 0,
        items_normalized: 0,
        normalization_errors: 1,
        rate_limit_remaining: 5,
        rate_limit_reset_seconds: 3600,
        error_summary: "API error",
        confidence_score: 0.0,
        data_quality_metrics: {
          schema_validation_pass_rate: 0.0,
          missing_field_rate: 1.0,
          anomaly_detection_flags: 5,
        },
        documentary_context: {
          is_sorensen_harvest: false,
          sorensen_keywords_matched: [],
        },
      });
    }

    const summary = await synthesizer.synthesizeMonthly();

    expect(summary.proposals_for_arps.length).toBeGreaterThan(0);
    const errorProposal = summary.proposals_for_arps.find(p => p.title.includes("reliability"));
    expect(errorProposal).toBeDefined();
  });
});
