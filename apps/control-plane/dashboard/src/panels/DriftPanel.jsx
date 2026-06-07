import React from 'react'
import { useApi } from '../hooks/useApi.js'

export default function DriftPanel() {
  const { data, error, loading } = useApi('drift/summary', [])

  return (
    <>
      <div className="panel-header">
        <div>
          <div className="panel-title">Drift</div>
          <div className="panel-subtitle">
            Drift fingerprints, thresholds, and active alerts
          </div>
        </div>
      </div>

      <div className="panel-metrics">
        <div className="metric-card">
          <div className="metric-label">Global drift score</div>
          <div className="metric-value warn">
            {loading ? '…' : data?.global_score?.toFixed?.(3) ?? '0.000'}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Regions above threshold</div>
          <div className="metric-value">
            {loading ? '…' : data?.regions_above_threshold ?? 0}
          </div>
        </div>
      </div>

      {error && (
        <div className="metric-card">
          <div className="metric-label">Error</div>
          <div className="metric-value danger">{error.message}</div>
        </div>
      )}
    </>
  )
}
