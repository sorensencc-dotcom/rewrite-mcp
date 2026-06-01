// File: projects/cic/src/slo/slo-evaluator.ts | Date: 2026-05-30 | v1.3.4

import { SLOThreshold, SLOEvaluation, SLOWindow } from "./slo-types.js"

export class SLOEvaluator {
  private windows: Record<string, SLOWindow> = {}

  registerWindow(name: string, maxSize = 86400) {
    this.windows[name] = { samples: [], timestamps: [], maxSize }
  }

  record(name: string, value: number) {
    const w = this.windows[name]
    if (!w) return
    w.samples.push(value)
    w.timestamps.push(Date.now())
    if (w.samples.length > w.maxSize) {
      w.samples.shift()
      w.timestamps.shift()
    }
  }

  evaluate(threshold: SLOThreshold): SLOEvaluation {
    const w = this.windows[threshold.name]
    if (!w || w.samples.length === 0) {
      return {
        name: threshold.name,
        ok: true,
        value: 0,
        threshold: threshold.p95,
        timestamp: Date.now()
      }
    }

    const sorted = [...w.samples].sort((a, b) => a - b)
    const idx = Math.floor((sorted.length - 1) * 0.95)
    const p95 = sorted[idx]

    const ok = p95 <= threshold.p95

    return {
      name: threshold.name,
      ok,
      value: p95,
      threshold: threshold.p95,
      reason: ok ? undefined : `p95=${p95} exceeded threshold=${threshold.p95}`,
      timestamp: Date.now()
    }
  }
}
