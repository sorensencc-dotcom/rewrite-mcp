import React from 'react'
import { useApi } from '../hooks/useApi.js'

export default function CognitionPanel() {
  const summary = useApi('cognition/summary', [])
  const packets = useApi('cognition/reasoning-packets', [])

  const loading = summary.loading || packets.loading
  const error = summary.error || packets.error

  const s = summary.data ?? {}
  const p = packets.data ?? {}

  return (
    <>
      <div className="panel-header">
        <div>
          <div className="panel-title">Cognitive Loops</div>
          <div className="panel-subtitle">
            Self‑tuning, prompt evolution, heuristic optimization
          </div>
        </div>
      </div>

      <div className="panel-metrics">
        <div className="metric-card">
          <div className="metric-label">Active loops</div>
          <div className="metric-value">
            {loading ? '…' : s?.active_loops ?? 0}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Update success rate</div>
          <div className="metric-value ok">
            {loading ? '…' : `${s?.update_success_rate ?? 0}%`}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Drift score</div>
          <div className="metric-value warn">
            {loading ? '…' : p?.drift_score?.toFixed?.(3) ?? '0.000'}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Stability</div>
          <div
            className={
              p?.stability_score >= 0.8
                ? 'metric-value ok'
                : p?.stability_score >= 0.6
                ? 'metric-value warn'
                : 'metric-value danger'
            }
          >
            {loading ? '…' : p?.stability_score?.toFixed?.(3) ?? '0.000'}
          </div>
        </div>
      </div>

      {p?.active_candidates?.length > 0 && (
        <>
          <div className="panel-header" style={{ marginTop: '20px' }}>
            <div className="panel-title" style={{ fontSize: '13px' }}>
              Reasoning Candidates
            </div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Preview</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {p.active_candidates.map((c, i) => (
                <tr key={i}>
                  <td>
                    <span className="badge ok">{c.type}</span>
                  </td>
                  <td className="code">{c.content?.substring(0, 60) ?? '—'}</td>
                  <td>
                    {c.metadata?.confidence
                      ? `${(c.metadata.confidence * 100).toFixed(0)}%`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {p?.context && (
        <>
          <div className="panel-header" style={{ marginTop: '20px' }}>
            <div className="panel-title" style={{ fontSize: '13px' }}>
              Reasoning Context
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Narrative spine</div>
            <div className="code">{p.context.narrativeSpine?.substring(0, 100)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Recent expansions</div>
            <div className="metric-value">
              {p.context.recentExpansions?.length ?? 0}
            </div>
          </div>
        </>
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
