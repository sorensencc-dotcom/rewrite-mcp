#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read cost log
const costLogPath = path.join(__dirname, "..", "benchmarks", "costs", "costLog.json");

if (!fs.existsSync(costLogPath)) {
  console.log("No cost data yet. costLog.json not found.");
  process.exit(0);
}

let costLog = [];
try {
  const data = fs.readFileSync(costLogPath, "utf8");
  costLog = JSON.parse(data);
  console.log(`Read ${costLog.length} cost entries from costLog.json`);
} catch (err) {
  console.error("Error reading costLog.json:", err.message);
  process.exit(1);
}

// Generate Helm dashboard
const today = new Date().toISOString().slice(0, 10);
const todayEntries = costLog.filter((e) => e.timestamp.startsWith(today));

console.log(`Found ${todayEntries.length} entries for today (${today})`);

const todaySummary = {
  totalRealUsd: todayEntries.reduce((s, e) => s + (e.amountUsd ?? 0), 0),
  totalImpliedUsd: todayEntries.reduce((s, e) => s + e.impliedCostUsd, 0),
  byProvider: todayEntries.reduce(
    (acc, e) => {
      const key = e.provider;
      if (!acc[key]) acc[key] = { realUsd: 0, impliedUsd: 0 };
      acc[key].realUsd += e.amountUsd ?? 0;
      acc[key].impliedUsd += e.impliedCostUsd;
      return acc;
    },
    {}
  ),
};

const dashboard = {
  today: todaySummary,
  generatedAt: new Date().toISOString(),
};

const helmDir = path.join(__dirname, "..", "benchmarks", "costs", "reports");
const helmPath = path.join(helmDir, "helm.json");

// Create directory if it doesn't exist
if (!fs.existsSync(helmDir)) {
  fs.mkdirSync(helmDir, { recursive: true });
}

// Write helm.json
fs.writeFileSync(helmPath, JSON.stringify(dashboard, null, 2), "utf8");

console.log(`✓ Generated helm.json`);
console.log();
console.log(`Today's Spend`);
console.log(`Real:    $${dashboard.today.totalRealUsd.toFixed(2)}`);
console.log(`Implied: $${dashboard.today.totalImpliedUsd.toFixed(2)}`);
console.log();
console.log(`By Provider:`);
for (const [provider, costs] of Object.entries(dashboard.today.byProvider)) {
  console.log(`${provider}: $${costs.realUsd.toFixed(2)} real / $${costs.impliedUsd.toFixed(2)} implied`);
}
console.log();
console.log(`Helm dashboard: benchmarks/costs/reports/helm.json`);
