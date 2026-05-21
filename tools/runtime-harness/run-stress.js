import { readFileSync } from "fs";
import { randomUUID } from "crypto";

const cfg = JSON.parse(readFileSync("./harness.config.json", "utf8"));

let inFlight = 0;
let successCount = 0;
let failCount = 0;
const latencies = [];

async function fireOne(workerId) {
  inFlight++;
  const start = Date.now();
  const correlationId = `stress-${randomUUID().slice(0, 8)}`;
  
  try {
    const res = await fetch(cfg.targetBaseUrl + cfg.endpoint, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Correlation-ID": correlationId
      },
      body: JSON.stringify(cfg.payloadTemplate)
    });
    
    const ok = res.ok;
    const latency = Date.now() - start;
    latencies.push(latency);
    
    if (ok) {
      successCount++;
    } else {
      failCount++;
      const text = await res.text();
      process.stdout.write(`\n[${correlationId}] ERR ${res.status}: ${text.slice(0, 50)}\n`);
    }
    
    process.stdout.write(
      `\r[Worker ${workerId}] ${ok ? "OK " : "ERR"} ${latency}ms | inFlight=${inFlight} ok=${successCount} fail=${failCount}`
    );
  } catch (err) {
    failCount++;
    process.stdout.write(`\nFETCH ERR: ${err.message}\n`);
  } finally {
    inFlight--;
  }
}

async function main() {
  console.log(`Starting stress test against ${cfg.targetBaseUrl}${cfg.endpoint}`);
  console.log(`Concurrency: ${cfg.concurrency}, Duration: ${cfg.durationSeconds}s`);
  
  const endAt = Date.now() + cfg.durationSeconds * 1000;

  const workers = Array.from({ length: cfg.concurrency }, (_, i) =>
    (async function worker() {
      while (Date.now() < endAt) {
        await fireOne(i);
      }
    })()
  );

  await Promise.all(workers);
  
  const total = successCount + failCount;
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
  const maxLatency = Math.max(...latencies, 0);
  const minLatency = Math.min(...latencies, 0);

  console.log("\n\n--- RESULTS ---");
  console.log(`Total Requests: ${total}`);
  console.log(`Successful:     ${successCount}`);
  console.log(`Failed:         ${failCount}`);
  console.log(`Success Rate:   ${((successCount / (total || 1)) * 100).toFixed(2)}%`);
  console.log(`Avg Latency:    ${avgLatency.toFixed(2)}ms`);
  console.log(`Max Latency:    ${maxLatency}ms`);
  console.log(`Min Latency:    ${minLatency}ms`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
