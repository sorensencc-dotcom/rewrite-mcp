// scripts/calibrate-confidence.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { queryMemory } from "../src/client/memory-client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const [,, datasetPath, outputPath] = process.argv;

  if (!datasetPath || !outputPath) {
    console.error("Usage: calibrate-confidence <dataset.json> <output.json>");
    process.exit(1);
  }

  const raw = fs.readFileSync(datasetPath, "utf8");
  const data = JSON.parse(raw);

  const bins = Array.from({ length: 10 }, (_, i) => ({
    lower: i / 10,
    upper: (i + 1) / 10,
    total: 0,
    correct: 0
  }));

  for (const ex of data.examples) {
    const resp = await queryMemory(ex.question_text);
    const c = resp.confidence ?? 0;

    const idx = Math.min(9, Math.floor(c * 10));
    const bin = bins[idx];
    bin.total++;

    const predicted = resp.answer_text.trim();
    const expected = ex.answer_text.trim();
    const isCorrect = predicted === expected;

    if (isCorrect) bin.correct++;
  }

  const calibration = {
    bins: bins.map(b => ({
      lower: b.lower,
      upper: b.upper,
      accuracy: b.total ? b.correct / b.total : 0,
      total: b.total
    }))
  };

  fs.writeFileSync(outputPath, JSON.stringify(calibration, null, 2), "utf8");
  console.log("Wrote calibration to", outputPath);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
