import React from 'react'
import { useApi } from '../hooks/useApi.js'

export default function MemosPanel() {
  const summary = useApi('memos/summary', [])
  const recent = useApi('memos/recent', [])

  const loading = summary.loading || recent.loading
  const error = summary.error || recent.error

  const s = summary.data ?? {}

  return (
    <>
      <div className="panel-header">
        <div>
          <div className="panel-title">Memos</div>
          <div className="panel-subtitle">
            Ingestion status, sync health, and normalized evidence
          </div>
        </div>
      </div>

      <div className="panel-metrics">
        <div className="metric-card">
          <div className="metric-label">Last sync</div>
          <div className="metric-value">
            {loading ? '…' : s.last_sync ?? 'never'}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Notes ingested</div>
          <div className="metric-value">
            {loading ? '…' : s.total_notes ?? 0}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Distinct tags</div>
          <div className="metric-value">
            {loading ? '…' : s.distinct_tags ?? 0}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Last error</div>
          <div className="metric-value">
            {loading ? '…' : s.last_error ?? 'none'}
          </div>
        </div>
      </div>

      {recent.data?.items?.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Title</th>
              <th>Tags</th>
              <th>Preview</th>
            </tr>
          </thead>
          <tbody>
            {recent.data.items.map((m) => (
              <tr key={m.id}>
                <td>{m.timestamp}</td>
                <td className="code">{m.title ?? '(untitled)'}</td>
                <td>{m.tags?.join(', ')}</td>
                <td>{m.preview}</td>
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
