import React from 'react'
import { useApi } from '../hooks/useApi.js'

export default function FederationPanel() {
  const { data, error, loading } = useApi('federation/summary', [])

  return (
    <>
      <div className="panel-header">
        <div>
          <div className="panel-title">Federation</div>
          <div className="panel-subtitle">
            Region health, divergence, and propagation status
          </div>
        </div>
      </div>

      <div className="panel-metrics">
        <div className="metric-card">
          <div className="metric-label">Regions</div>
          <div className="metric-value">
            {loading ? '…' : data?.regions ?? 0}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Unhealthy regions</div>
          <div className="metric-value danger">
            {loading ? '…' : data?.unhealthy_regions ?? 0}
          </div>
        </div>
      </div>

      {data?.regions_detail?.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Region</th>
              <th>Status</th>
              <th>Drift</th>
              <th>Latency</th>
            </tr>
          </thead>
          <tbody>
            {data.regions_detail.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>
                  <span
                    className={
                      r.status === 'healthy'
                        ? 'badge ok'
                        : r.status === 'degraded'
                        ? 'badge warn'
                        : 'badge danger'
                    }
                  >
                    {r.status}
                  </span>
                </td>
                <td>{r.drift_score?.toFixed?.(3)}</td>
                <td>{r.latency_ms} ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {error && (
        <div className="metric-card">
          <div className="metric-label">Error</div>
          <div className="metric-value danger">{error.message}</div>
        </div>
      )}
    </>
  )
}
