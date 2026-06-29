import React, { useState, useEffect } from 'react';
import './DocsManagerPanel.css';

interface AuditEvent {
  timestamp: number;
  sequenceId: number;
  docId: string;
  path: string;
  severity: 'info' | 'warning' | 'error';
  category: 'schema' | 'format' | 'reference' | 'coverage';
  message: string;
}

interface DocsManagerMetrics {
  drift: number;
  auditCount: number;
  lastSync: number | null;
  eventsProcessed: number;
  eventsSkipped: number;
  audits: AuditEvent[];
}

interface DocsManagerPanelProps {
  refreshInterval?: number; // ms, default 5000
}

export const DocsManagerPanel: React.FC<DocsManagerPanelProps> = ({ refreshInterval = 5000 }) => {
  const [metrics, setMetrics] = useState<DocsManagerMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/console/metrics');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (data.status === 'ok' && data.data.docsManager) {
        setMetrics(data.data.docsManager);
        setLastUpdate(new Date());
      } else {
        setError('No docs-manager data in response');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const formatTimestamp = (ts: number | null) => {
    if (!ts) return 'Never';
    const d = new Date(ts);
    return d.toLocaleTimeString();
  };

  const getSeverityClass = (severity: string) => {
    return `severity-${severity}`;
  };

  return (
    <div className="docs-manager-panel">
      <div className="panel-header">
        <h3>Documentation Manager</h3>
        <div className="panel-controls">
          <button onClick={fetchMetrics} disabled={loading} className="refresh-btn">
            {loading ? '⟳ Fetching...' : '⟳ Refresh'}
          </button>
          {lastUpdate && (
            <span className="last-update">
              Updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="error-state">
          <p>Error: {error}</p>
        </div>
      )}

      {!metrics && !error && loading && (
        <div className="loading-state">
          <p>Loading documentation metrics...</p>
        </div>
      )}

      {!metrics && !error && !loading && (
        <div className="empty-state">
          <p>No data available. Check ingestion logs.</p>
        </div>
      )}

      {metrics && (
        <>
          <section className="docs-section summary-section">
            <h4>Summary</h4>
            <ul className="metrics-list">
              <li>
                <span className="label">Drift Score:</span>
                <span className={`value drift-${Math.min(Math.floor(metrics.drift * 10), 9)}`}>
                  {metrics.drift.toFixed(2)}
                </span>
              </li>
              <li>
                <span className="label">Audit Events:</span>
                <span className="value">{metrics.auditCount}</span>
              </li>
              <li>
                <span className="label">Last Sync:</span>
                <span className="value">{formatTimestamp(metrics.lastSync)}</span>
              </li>
              <li>
                <span className="label">Events Processed:</span>
                <span className="value">{metrics.eventsProcessed}</span>
              </li>
              <li>
                <span className="label">Events Skipped:</span>
                <span className="value">{metrics.eventsSkipped}</span>
              </li>
            </ul>
          </section>

          {metrics.audits.length > 0 && (
            <section className="docs-section audits-section">
              <h4>Recent Audits (Last 10)</h4>
              <div className="audits-table">
                <div className="audits-header">
                  <span className="col-severity">Severity</span>
                  <span className="col-docid">Doc ID</span>
                  <span className="col-category">Category</span>
                  <span className="col-message">Message</span>
                </div>
                {metrics.audits.map((audit, i) => (
                  <div key={i} className={`audits-row ${getSeverityClass(audit.severity)}`}>
                    <span className="col-severity">
                      <span className="badge">{audit.severity}</span>
                    </span>
                    <span className="col-docid" title={audit.docId}>
                      {audit.docId.slice(0, 15)}...
                    </span>
                    <span className="col-category">{audit.category}</span>
                    <span className="col-message" title={audit.message}>
                      {audit.message.slice(0, 50)}...
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default DocsManagerPanel;
