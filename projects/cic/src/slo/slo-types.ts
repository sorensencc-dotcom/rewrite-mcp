// File: projects/cic/src/slo/slo-types.ts | Date: 2026-05-30 | v1.3.4

export interface SLOThreshold {
  name: string
  p95: number
  maxErrorRate?: number
  maxContradictionRate?: number
  maxBundleSize?: number
}

export interface SLOEvaluation {
  name: string
  ok: boolean
  value: number
  threshold: number
  reason?: string
  timestamp: number
}

export interface SLOWindow {
  samples: number[]
  timestamps: number[]
  maxSize: number
}
