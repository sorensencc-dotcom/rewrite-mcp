// File: projects/cic/src/slo/stability-report-generator.ts | Date: 2026-05-30 | v1.3.4

import { SLOEvaluation } from "./slo-types.js"
import fs from "fs"
import path from "path"

export function generateStabilityReport(evals: SLOEvaluation[]) {
  const lines = []
  lines.push("# CIC Stability Report — v1.3.4")
  lines.push("")
  lines.push("Generated: " + new Date().toISOString())
  lines.push("")

  for (const e of evals) {
    lines.push(`## ${e.name}`)
    lines.push(`- OK: ${e.ok}`)
    lines.push(`- p95: ${e.value}`)
    lines.push(`- threshold: ${e.threshold}`)
    if (e.reason) lines.push(`- reason: ${e.reason}`)
    lines.push("")
  }

  const out = lines.join("\n")
  const targetPath = "projects/cic/docs/reports/stability/v1.3.4/stability-report.md"
  const dir = path.dirname(targetPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(targetPath, out)
  return out
}
