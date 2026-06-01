import React from 'react'
import { useApi } from '../hooks/useApi.js'

export default function ExpansionPanel() {
  const { data, error, loading } = useApi('expansion/summary', [])

  return (
    <>
      <div className="panel-header">
        <div>
          <div className="panel-title">Autonomous Expansion</div>
          <div className="panel-subtitle">
            Capability gaps, proposals, approvals, rejections
          </div>
        </div>
      </div>

      <div className="panel-metrics">
        <div className="metric-card">
          <div className="metric-label">Open proposals</div>
          <div className="metric-value">
            {loading ? '…' : data?.open_proposals ?? 0}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Approval rate (24h)</div>
          <div className="metric-value">
            {loading ? '…' : `${data?.approval_rate_24h ?? 0}%`}
          </div>
        </div>
      </div>

      {data?.recent_events?.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>ID</th>
              <th>Type</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            {data.recent_events.map((e) => (
              <tr key={e.id}>
                <td>{e.timestamp}</td>
                <td className="code">{e.id}</td>
                <td>{e.type}</td>
                <td>{e.decision}</td>
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
