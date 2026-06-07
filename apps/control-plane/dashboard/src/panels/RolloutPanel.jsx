import React from 'react'
import { useApi } from '../hooks/useApi.js'

export default function RolloutPanel() {
  const { data, error, loading } = useApi('rollout/summary', [])

  return (
    <>
      <div className="panel-header">
        <div>
          <div className="panel-title">Rollout</div>
          <div className="panel-subtitle">
            Canary, progressive rollout, and divergence guardrails
          </div>
        </div>
      </div>

      <div className="panel-metrics">
        <div className="metric-card">
          <div className="metric-label">Active canaries</div>
          <div className="metric-value">
            {loading ? '…' : data?.active_canaries ?? 0}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Rollback events (24h)</div>
          <div className="metric-value danger">
            {loading ? '…' : data?.rollback_events_24h ?? 0}
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
