import React, { useState, useEffect } from 'react';
import './CognitionPanel.css';

interface FormattedTraceStep {
  subsystem: string;
  summary: string;
  score: number;
}

interface CompositeScores {
  coherence: number;
  semantic: number;
  temporal: number;
  causal: number;
  narrative: number;
  overall: number;
}

interface DriftVector {
  semanticDrift: number;
  temporalDrift: number;
  narrativeDrift: number;
  causalDrift: number;
  compositeDrift: number;
  overall: number;
}

interface CognitionPanelProps {
  selectedId?: string;
}

export const CognitionPanel: React.FC<CognitionPanelProps> = ({ selectedId }) => {
  const [trace, setTrace] = useState<FormattedTraceStep[]>([]);
  const [composite, setComposite] = useState<CompositeScores | null>(null);
  const [drift, setDrift] = useState<DriftVector | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedId) return;

    setLoading(true);

    Promise.all([
      fetch(`/api/v1/cognition/arl/trace/${selectedId}`)
        .then(r => r.json())
        .then(d => setTrace(d.trace ?? [])),
      fetch(`/api/v1/cognition/arl/composite/${selectedId}`)
        .then(r => r.json())
        .then(d => setComposite(d.composite ?? null)),
      fetch(`/api/v1/cognition/arl/drift/${selectedId}`)
        .then(r => r.json())
        .then(d => setDrift(d.drift ?? null)),
    ]).finally(() => setLoading(false));
  }, [selectedId]);

  if (!selectedId) {
    return <div className="cognition-panel">Select an ARL verdict to view details</div>;
  }

  if (loading) {
    return <div className="cognition-panel">Loading ARL data...</div>;
  }

  return (
    <div className="cognition-panel">
      <section className="arl-section">
        <h3>ARL Reasoning Trace</h3>
        {trace.length > 0 ? (
          <div className="trace-container">
            {trace.map((step, i) => (
              <div key={i} className="trace-row">
                <span className="trace-subsystem">{step.subsystem}</span>
                <span className="trace-summary">{step.summary}</span>
                <span className="trace-score">{step.score.toFixed(2)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No trace data available</p>
        )}
      </section>

      <section className="arl-section">
        <h3>Composite Reasoning</h3>
        {composite ? (
          <ul className="composite-list">
            <li>
              <span className="label">Coherence:</span>
              <span className="value">{composite.coherence.toFixed(2)}</span>
            </li>
            <li>
              <span className="label">Semantic:</span>
              <span className="value">{composite.semantic.toFixed(2)}</span>
            </li>
            <li>
              <span className="label">Temporal:</span>
              <span className="value">{composite.temporal.toFixed(2)}</span>
            </li>
            <li>
              <span className="label">Causal:</span>
              <span className="value">{composite.causal.toFixed(2)}</span>
            </li>
            <li>
              <span className="label">Narrative:</span>
              <span className="value">{composite.narrative.toFixed(2)}</span>
            </li>
            <li className="overall-row">
              <span className="label">Overall:</span>
              <span className="value">{composite.overall.toFixed(2)}</span>
            </li>
          </ul>
        ) : (
          <p className="empty-state">No composite data available</p>
        )}
      </section>

      <section className="arl-section">
        <h3>Drift Vector</h3>
        {drift ? (
          <ul className="drift-list">
            <li>
              <span className="label">Semantic:</span>
              <span className="value">{drift.semanticDrift.toFixed(2)}</span>
            </li>
            <li>
              <span className="label">Temporal:</span>
              <span className="value">{drift.temporalDrift.toFixed(2)}</span>
            </li>
            <li>
              <span className="label">Narrative:</span>
              <span className="value">{drift.narrativeDrift.toFixed(2)}</span>
            </li>
            <li>
              <span className="label">Causal:</span>
              <span className="value">{drift.causalDrift.toFixed(2)}</span>
            </li>
            <li>
              <span className="label">Composite:</span>
              <span className="value">{drift.compositeDrift.toFixed(2)}</span>
            </li>
            <li className="overall-row">
              <span className="label">Overall:</span>
              <span className="value">{drift.overall.toFixed(2)}</span>
            </li>
          </ul>
        ) : (
          <p className="empty-state">No drift data available</p>
        )}
      </section>
    </div>
  );
};

export default CognitionPanel;
