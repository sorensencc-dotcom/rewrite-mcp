import React from 'react'
import { useApi } from '../hooks/useApi.js'

export default function ArbitrationPanel() {
  const { data, error, loading } = useApi('arbitration/summary', [])

  return (
    <>
      <div className="panel-header">
        <div>
          <div className="panel-title">Arbitration</div>
          <div className="panel-subtitle">
            Global arbitration mesh — divergence, winners, losers
          </div>
        </div>
      </div>

      <div className="panel-metrics">
        <div className="metric-card">
          <div className="metric-label">Active arbitration flows</div>
          <div className="metric-value">
            {loading ? '…' : data?.active_flows ?? '0'}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Average divergence</div>
          <div className="metric-value">
            {loading ? '…' : data?.avg_divergence?.toFixed?.(3) ?? '0.000'}
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
