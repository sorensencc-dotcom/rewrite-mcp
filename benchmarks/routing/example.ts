/**
 * Example: Phase 47 Integration
 *
 * Demonstrates how to use the routing layer in a real scenario.
 */

import { Anthropic } from "@anthropic-ai/sdk";
import { selectModel } from "./router";
import { routedAnthropicCall, routedCall } from "./interceptor";
import { startCostAgent } from "./agent";

// Initialize client
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function exampleBasicRouting() {
  console.log("\n=== Example 1: Basic Model Selection ===\n");

  const decision = await selectModel({
    taskType: "rewrite",
    qualityTarget: 8.0,
    maxCostUsd: 0.10,
    dailyBudgetUsd: 5.00,
  });

  console.log(`Task: rewrite`);
  console.log(`Quality target: 8.0`);
  console.log(`Max cost per request: $0.10`);
  console.log(`Daily budget: $5.00`);
  console.log();
  console.log(`Selected model: ${decision.chosen.provider}/${decision.chosen.model}`);
  console.log(`Quality score: ${decision.chosen.estimatedQuality}`);
  console.log(`Cost estimate: $${decision.costEstimateUsd.toFixed(4)}`);
  console.log(`Reasoning: ${decision.reason}`);
  console.log();
  console.log(`Alternatives:`);
  decision.alternatives.forEach((alt) => {
    console.log(
      `  - ${alt.provider}/${alt.model} (quality: ${alt.estimatedQuality})`
    );
  });
}

async function exampleRoutedCall() {
  console.log("\n=== Example 2: Routed API Call ===\n");

  const result = await routedCall<any>({
    taskType: "generation",
    qualityTarget: 7.5,
    maxCostUsd: 0.05,
    dailyBudgetUsd: 5.00,
    source: "benchmark",
    metadata: { command: "example" },
    call: async (model, provider) => {
      if (provider !== "anthropic") {
        throw new Error("Example only supports Anthropic");
      }

      const res = await client.messages.create({
        model,
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content:
              "Write a short, catchy tagline for a web design company in exactly 10 words.",
          },
        ],
      });

      return {
        content:
          res.content[0].type === "text" ? res.content[0].text : "",
        inputTokens: res.usage.input_tokens,
        outputTokens: res.usage.output_tokens,
        model,
        provider,
      };
    },
  });

  console.log(`Routed to: ${result.decision.chosen.provider}/${result.decision.chosen.model}`);
  console.log(`Cost estimate: $${result.decision.costEstimateUsd.toFixed(4)}`);
  console.log(`Response: "${result.content}"`);
  console.log(`Tokens: ${result.inputTokens} input, ${result.outputTokens} output`);
}

async function exampleRoutedAnthropicCall() {
  console.log("\n=== Example 3: Routed Anthropic Call (Helper) ===\n");

  const result = await routedAnthropicCall({
    client,
    routing: {
      taskType: "analysis",
      qualityTarget: 8.5,
      maxCostUsd: 0.10,
      dailyBudgetUsd: 5.00,
    },
    messages: [
      {
        role: "user",
        content:
          "Analyze this sentence: 'The quick brown fox jumps over the lazy dog.' List all nouns.",
      },
    ],
    source: "benchmark",
    metadata: { task: "nlp-analysis" },
  });

  console.log(`Routing decision:`, result.decision.reason);
  console.log(`Content: "${(result as any).content}"`);
}

async function exampleDryRun() {
  console.log("\n=== Example 4: Dry Run (No API Call) ===\n");

  const result = await routedAnthropicCall({
    client,
    routing: {
      taskType: "rewrite",
      qualityTarget: 9.0,
      maxCostUsd: 0.05,
      dailyBudgetUsd: 3.00,
    },
    messages: [
      {
        role: "user",
        content: "This would normally make an API call, but dryRun=true",
      },
    ],
    dryRun: true, // Don't actually call API
  });

  console.log(`Would use: ${result.decision.chosen.provider}/${result.decision.chosen.model}`);
  console.log(`Cost estimate: $${result.decision.costEstimateUsd.toFixed(4)}`);
  console.log(`Reasoning: ${result.decision.reason}`);
  console.log(`(No API call made due to dryRun=true)`);
}

async function exampleCostAgent() {
  console.log("\n=== Example 5: Cost Agent (Background Monitor) ===\n");

  console.log("Starting cost agent...");
  console.log("(In production, this runs continuously in the background)");
  console.log();

  const stop = startCostAgent({
    checkIntervalMs: 30_000, // Check every 30 seconds
    dailyBudgetUsd: 5.00,
    hourlyBudgetUsd: 1.00,
    shiftToLocalThreshold: 0.7,
    onEvent: (event) => {
      const timestamp = new Date().toISOString();
      if (event.type === "budget-warning") {
        console.log(
          `[${timestamp}] ⚠️  Budget warning: $${event.spendUsd.toFixed(2)} spent (${event.level})`
        );
      } else if (event.type === "prefer-local") {
        console.log(
          `[${timestamp}] 🔄 Preference shift: ${event.reason}`
        );
      } else if (event.type === "switch-to-cheaper") {
        console.log(
          `[${timestamp}] 💰 Cost optimization: ${event.reason}`
        );
      }
    },
  });

  console.log("(Agent running; would emit events as budgets are approached)");
  console.log();

  // Let it run for a moment, then stop
  await new Promise((r) => setTimeout(r, 2000));
  stop();
  console.log("Agent stopped.");
}

async function runAllExamples() {
  try {
    // These examples require Phase 48 cost data, so they may not all succeed
    // if no costs have been logged yet. Run them in a controlled way.

    console.log("╔════════════════════════════════════════╗");
    console.log("║  Phase 47 — Routing Layer Examples  ║");
    console.log("╚════════════════════════════════════════╝");

    // Example 1: Basic routing (no API call needed)
    await exampleBasicRouting();

    // Example 2: Dry run (test without calling API)
    await exampleDryRun();

    // Example 3: Cost agent demo
    await exampleCostAgent();

    // Examples 2 & 3 require API credits, so comment out by default
    // Uncomment to test with real API calls:
    // await exampleRoutedCall();
    // await exampleRoutedAnthropicCall();

    console.log("\n✅ Examples complete.");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

runAllExamples();
