import React from 'react'
import { useApi } from '../hooks/useApi.js'

export default function CognitionPanel() {
  const summary = useApi('cognition/summary', [])
  const packets = useApi('cognition/reasoning-packets', [])
  const arlHealth = useApi('cognition/arl/health', [])
  const arlRejectionAnalysis = useApi('cognition/arl/rejection-analysis', [])

  const loading = summary.loading || packets.loading || arlHealth.loading || arlRejectionAnalysis.loading
  const error = summary.error || packets.error || arlHealth.error || arlRejectionAnalysis.error

  const s = summary.data ?? {}
  const p = packets.data ?? {}
  const arl = arlHealth.data ?? {}
  const rejectionData = arlRejectionAnalysis.data ?? {}

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

      {arl && (
        <>
          <div className="panel-header" style={{ marginTop: '20px' }}>
            <div className="panel-title" style={{ fontSize: '13px' }}>
              Autonomous Reasoning Layer (ARL)
            </div>
          </div>
          <div className="panel-metrics">
            <div className="metric-card">
              <div className="metric-label">Overall health</div>
              <div
                className={
                  arl.overallHealth === 'good'
                    ? 'metric-value ok'
                    : arl.overallHealth === 'fair'
                    ? 'metric-value warn'
                    : 'metric-value danger'
                }
              >
                {loading ? '…' : arl.overallHealth?.toUpperCase() ?? 'UNKNOWN'}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Avg coherence</div>
              <div className="metric-value">
                {loading ? '…' : `${(arl?.metrics?.avgCoherence * 100).toFixed(1)}%` ?? '—'}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Avg drift</div>
              <div
                className={
                  arl?.metrics?.avgDrift < 0.3
                    ? 'metric-value ok'
                    : arl?.metrics?.avgDrift < 0.5
                    ? 'metric-value warn'
                    : 'metric-value danger'
                }
              >
                {loading ? '…' : `${(arl?.metrics?.avgDrift * 100).toFixed(1)}%` ?? '—'}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Verdict success rate</div>
              <div className="metric-value ok">
                {loading ? '…' : `${(arl?.metrics?.successRate * 100).toFixed(1)}%` ?? '—'}
              </div>
            </div>
          </div>

          <div className="panel-header" style={{ marginTop: '16px' }}>
            <div className="panel-title" style={{ fontSize: '12px' }}>
              Coherence Dimensions
            </div>
          </div>
          <div className="panel-metrics">
            <div className="metric-card">
              <div className="metric-label">Narrative coherence</div>
              <div className="metric-value">
                {loading ? '…' : `${(arl?.coherence?.narrative * 100).toFixed(1)}%` ?? '—'}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Semantic coherence</div>
              <div className="metric-value">
                {loading ? '…' : `${(arl?.coherence?.semantic * 100).toFixed(1)}%` ?? '—'}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Temporal coherence</div>
              <div className="metric-value">
                {loading ? '…' : `${(arl?.coherence?.temporal * 100).toFixed(1)}%` ?? '—'}
              </div>
            </div>
          </div>
        </>
      )}

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

      {rejectionData?.totalRejections !== undefined && rejectionData.totalRejections > 0 && (
        <>
          <div className="panel-header" style={{ marginTop: '20px' }}>
            <div className="panel-title" style={{ fontSize: '13px' }}>
              ARL Rejection Analysis
            </div>
          </div>
          <div className="panel-metrics">
            <div className="metric-card">
              <div className="metric-label">Total rejections</div>
              <div className="metric-value danger">
                {loading ? '…' : rejectionData.totalRejections ?? 0}
              </div>
            </div>
            {Object.entries(rejectionData.byReason || {}).map(([reason, count]) => (
              <div key={reason} className="metric-card">
                <div className="metric-label">{reason}</div>
                <div className="metric-value">{count}</div>
              </div>
            ))}
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
