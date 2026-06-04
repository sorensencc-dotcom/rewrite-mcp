// File: projects/cic/ingestion/scratch/test-autotune-scoring.js

import { runScoringPipelinePartial } from "../src/pipeline/score-pipeline.js";
import { recordCompression, recordMCPLatency } from "../src/lib/headroomTelemetry.js";

async function main() {
  console.log("=== Staging Telemetry Metrics ===");
  // Simulate 3 headroom compression runs
  recordCompression(100, 30); // 0.3 ratio
  recordCompression(100, 50); // 0.5 ratio
  recordCompression(100, 40); // 0.4 ratio

  // Simulate 3 MCP latencies (average 200ms)
  recordMCPLatency(150);
  recordMCPLatency(250);
  recordMCPLatency(200);

  console.log("=== Running Pipeline (Partial Mode: excluding LLM dependencies) ===");
  const htmlContent = `
    <html>
      <head><title>Test Page</title></head>
      <body>
        <h1>Cast Iron Charlie Test</h1>
        <h2>Section 1</h2>
        <p>This is a test of the auto-tuning context efficiency scorer integration.</p>
        <img src="photo.jpg" alt="A nice photo">
        <a href="https://example.com">Example Link</a>
      </body>
    </html>
  `;

  const result = await runScoringPipelinePartial({
    content: htmlContent,
    systems: ["heuristic", "structural", "accessibility"]
  });

  console.log("=== Pipeline Result ===");
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
