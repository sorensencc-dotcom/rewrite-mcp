/**
 * Phase 5a: Planning Console v3 — React UI Components
 * Tier 1 + 2 panels wired to live HTTP endpoints
 */

import React, { useEffect, useState } from 'react';

/**
 * Health Panel Component
 */
const HealthPanel: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);

  useEffect(() => {
    const fetchHealthData = async () => {
      try {
        const [healthRes, metricsRes, decisionsRes, approvalsRes] = await Promise.all([
          fetch('/api/health'),
          fetch('/api/metrics'),
          fetch('/api/governance/decisions?limit=20'),
          fetch('/api/approvals/pending'),
        ]);

        setHealth(await healthRes.json());
        setMetrics(await metricsRes.text());
        setDecisions(await decisionsRes.json());
        setPendingApprovals(await approvalsRes.json());
      } catch (error) {
        console.error('Failed to fetch health data:', error);
      }
    };

    fetchHealthData();
    const interval = setInterval(fetchHealthData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="panel health-panel">
      <div className="panel-title">CIC Health</div>

      {/* Runtime Status */}
      <div className="section">
        <h3>Runtime Status</h3>
        {health?.services ? (
          <div className="service-grid">
            {health.services.map((service: any) => (
              <div key={service.name} className="service-card">
                <span className={`status-indicator ${service.status}`}></span>
                <span className="service-name">{service.name}</span>
                <span className="service-port">:{service.port}</span>
              </div>
            ))}
          </div>
        ) : (
          <p>Loading runtime status...</p>
        )}
      </div>

      {/* Event Ingestion Rate */}
      <div className="section">
        <h3>Event Ingestion Rate</h3>
        <div className="metric-gauge">
          <span className="metric-value">-- events/sec</span>
          <p className="metric-label">From metrics endpoint (Prometheus)</p>
        </div>
      </div>

      {/* Governance Decision Log */}
      <div className="section">
        <h3>Governance Decisions (Last 20)</h3>
        <div className="decision-timeline">
          {decisions.length > 0 ? (
            decisions.map((decision: any, idx: number) => (
              <div key={idx} className="decision-item">
                <span className={`decision-type ${decision.type}`}>{decision.type}</span>
                <span className="decision-actor">{decision.actor}</span>
                <span className="decision-outcome">{decision.outcome}</span>
                <span className="decision-time">{new Date(decision.timestamp).toLocaleTimeString()}</span>
              </div>
            ))
          ) : (
            <p>No recent decisions</p>
          )}
        </div>
      </div>

      {/* Approval Queue */}
      <div className="section">
        <h3>Pending Approvals</h3>
        <div className="approval-table">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Requested By</th>
                <th>Status</th>
                <th>Time Pending</th>
              </tr>
            </thead>
            <tbody>
              {pendingApprovals.length > 0 ? (
                pendingApprovals.map((approval: any, idx: number) => (
                  <tr key={idx}>
                    <td>{approval.type}</td>
                    <td>{approval.actor}</td>
                    <td className={`status ${approval.status}`}>{approval.status}</td>
                    <td>{approval.timePending}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>No pending approvals</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/**
 * Pipelines Panel Component
 */
const PipelinesPanel: React.FC = () => {
  const [ingestionJobs, setIngestionJobs] = useState<any[]>([]);
  const [queueDepth, setQueueDepth] = useState<any>(null);
  const [synthesisResults, setSynthesisResults] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);

  useEffect(() => {
    const fetchPipelineData = async () => {
      try {
        const [jobsRes, queueRes, synthesisRes, errorsRes] = await Promise.all([
          fetch('/api/ingestion/status'),
          fetch('/api/queue/depth'),
          fetch('/api/synthesis/results?limit=10'),
          fetch('/api/errors'),
        ]);

        setIngestionJobs(await jobsRes.json());
        setQueueDepth(await queueRes.json());
        setSynthesisResults(await synthesisRes.json());
        setErrors(await errorsRes.json());
      } catch (error) {
        console.error('Failed to fetch pipeline data:', error);
      }
    };

    fetchPipelineData();
    const interval = setInterval(fetchPipelineData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="panel pipelines-panel">
      <div className="panel-title">Pipelines</div>

      {/* Active Jobs */}
      <div className="section">
        <h3>Active Ingestion Jobs</h3>
        <div className="jobs-table">
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Status</th>
                <th>Events Processed</th>
                <th>Throughput</th>
                <th>ETA</th>
              </tr>
            </thead>
            <tbody>
              {ingestionJobs.length > 0 ? (
                ingestionJobs.map((job: any, idx: number) => (
                  <tr key={idx}>
                    <td>{job.source}</td>
                    <td className={`status ${job.status}`}>{job.status}</td>
                    <td>{job.eventsProcessed}</td>
                    <td>{job.throughput} events/sec</td>
                    <td>{job.estimatedTimeRemaining || '--'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>No active jobs</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Queue Depth */}
      <div className="section">
        <h3>Enrichment Queue</h3>
        <div className="queue-gauge">
          <span className="queue-value">{queueDepth?.depth || 0} items</span>
          <span className="queue-rate">{queueDepth?.processingRate || 0} items/sec</span>
        </div>
      </div>

      {/* Synthesis Results */}
      <div className="section">
        <h3>Synthesis Results</h3>
        <div className="synthesis-timeline">
          {synthesisResults.length > 0 ? (
            synthesisResults.map((result: any, idx: number) => (
              <div key={idx} className="synthesis-item">
                <span className={`result-type ${result.type}`}>{result.type}</span>
                <span className="result-status">{result.status}</span>
                <span className="result-duration">{result.duration}ms</span>
              </div>
            ))
          ) : (
            <p>No recent synthesis results</p>
          )}
        </div>
      </div>

      {/* Failures */}
      <div className="section">
        <h3>Failures</h3>
        <div className="failure-list">
          {errors.length > 0 ? (
            errors.map((error: any, idx: number) => (
              <div key={idx} className="error-item">
                <span className="error-service">{error.service}</span>
                <span className="error-type">{error.errorType}</span>
                <span className="error-count">{error.count || 1}x</span>
              </div>
            ))
          ) : (
            <p>No recent errors</p>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Agents Panel Component
 */
const AgentsPanel: React.FC = () => {
  const [proposals, setProposals] = useState<any[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<any[]>([]);
  const [failures, setFailures] = useState<any[]>([]);
  const [costs, setCosts] = useState<any[]>([]);

  useEffect(() => {
    const fetchAgentData = async () => {
      try {
        const [proposalsRes, historyRes, failuresRes, costsRes] = await Promise.all([
          fetch('/api/autonomy/proposals?limit=20'),
          fetch('/api/approvals/history?limit=20'),
          fetch('/api/agents/failures'),
          fetch('/api/cost/tracking'),
        ]);

        setProposals(await proposalsRes.json());
        setApprovalHistory(await historyRes.json());
        setFailures(await failuresRes.json());
        setCosts(await costsRes.json());
      } catch (error) {
        console.error('Failed to fetch agent data:', error);
      }
    };

    fetchAgentData();
    const interval = setInterval(fetchAgentData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="panel agents-panel">
      <div className="panel-title">Agents</div>

      {/* Invocation History */}
      <div className="section">
        <h3>Invocation History</h3>
        <div className="proposals-table">
          <table>
            <thead>
              <tr>
                <th>Skill</th>
                <th>Status</th>
                <th>Cost</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {proposals.length > 0 ? (
                proposals.map((proposal: any, idx: number) => (
                  <tr key={idx}>
                    <td>{proposal.skillName}</td>
                    <td className={`status ${proposal.status}`}>{proposal.status}</td>
                    <td>${proposal.cost || 0}</td>
                    <td>{proposal.outcome || '--'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>No recent invocations</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval Audit */}
      <div className="section">
        <h3>Approval Audit Trail</h3>
        <div className="audit-timeline">
          {approvalHistory.length > 0 ? (
            approvalHistory.map((approval: any, idx: number) => (
              <div key={idx} className="audit-item">
                <span className={`vote ${approval.vote}`}>{approval.vote}</span>
                <span className="approver">{approval.approver}</span>
                <span className="reasoning">{approval.reasoning || '--'}</span>
              </div>
            ))
          ) : (
            <p>No approval history</p>
          )}
        </div>
      </div>

      {/* Failure Patterns */}
      <div className="section">
        <h3>Failure Patterns (24h)</h3>
        <div className="failure-chart">
          {failures.length > 0 ? (
            failures.map((agent: any, idx: number) => (
              <div key={idx} className="failure-item">
                <span className="agent-name">{agent.agentName}</span>
                <span className="failure-rate">{agent.failureRate}%</span>
                <span className="error">{agent.mostCommonError}</span>
              </div>
            ))
          ) : (
            <p>No failures detected</p>
          )}
        </div>
      </div>

      {/* Cost Tracking */}
      <div className="section">
        <h3>Cost Tracking</h3>
        <div className="cost-cards">
          {costs.length > 0 ? (
            costs.map((cost: any, idx: number) => (
              <div key={idx} className="cost-card">
                <span className="agent-name">{cost.agentName}</span>
                <span className="cost-value">${cost.costUsd}</span>
                <span className="budget-percent">{cost.percentOfBudget}% of budget</span>
              </div>
            ))
          ) : (
            <p>No cost data available</p>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Alerts Panel Component
 */
const AlertsPanel: React.FC = () => {
  const [healthAlerts, setHealthAlerts] = useState<any[]>([]);
  const [driftWarnings, setDriftWarnings] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [costAlerts, setCostAlerts] = useState<any[]>([]);

  useEffect(() => {
    const fetchAlertData = async () => {
      try {
        const [healthRes, driftRes, violationsRes, costRes] = await Promise.all([
          fetch('/api/alerts/health'),
          fetch('/api/drift/warnings'),
          fetch('/api/violations'),
          fetch('/api/cost/alerts'),
        ]);

        setHealthAlerts(await healthRes.json());
        setDriftWarnings(await driftRes.json());
        setViolations(await violationsRes.json());
        setCostAlerts(await costRes.json());
      } catch (error) {
        console.error('Failed to fetch alert data:', error);
      }
    };

    fetchAlertData();
    const interval = setInterval(fetchAlertData, 5000); // Refresh every 5s for alerts
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="panel alerts-panel">
      <div className="panel-title">Alerts</div>

      {/* Health Thresholds */}
      <div className="section">
        <h3>Health Thresholds</h3>
        <div className="alert-list">
          {healthAlerts.length > 0 ? (
            healthAlerts.map((alert: any, idx: number) => (
              <div key={idx} className={`alert-row severity-${alert.severity}`}>
                <span className="service">{alert.service}</span>
                <span className="metric">{alert.metric}</span>
                <span className="value">{alert.currentValue}</span>
              </div>
            ))
          ) : (
            <p>No health alerts</p>
          )}
        </div>
      </div>

      {/* Drift Warnings */}
      <div className="section">
        <h3>Drift Warnings</h3>
        <div className="warning-list">
          {driftWarnings.length > 0 ? (
            driftWarnings.map((warning: any, idx: number) => (
              <div key={idx} className={`warning-row risk-${warning.risk}`}>
                <span className="type">{warning.type}</span>
                <span className="detected">{warning.detectedIn}</span>
                <span className="risk">{warning.risk}</span>
              </div>
            ))
          ) : (
            <p>No drift warnings</p>
          )}
        </div>
      </div>

      {/* Governance Violations */}
      <div className="section">
        <h3>Governance Violations</h3>
        <div className="violation-list">
          {violations.length > 0 ? (
            violations.map((violation: any, idx: number) => (
              <div key={idx} className={`violation-row severity-${violation.severity}`}>
                <span className="type">{violation.type}</span>
                <span className="item">{violation.item}</span>
                <span className="severity">{violation.severity}</span>
              </div>
            ))
          ) : (
            <p>No violations detected</p>
          )}
        </div>
      </div>

      {/* Cost Overruns */}
      <div className="section">
        <h3>Cost Overruns</h3>
        <div className="cost-alert-list">
          {costAlerts.length > 0 ? (
            costAlerts.map((alert: any, idx: number) => (
              <div key={idx} className="cost-alert-row">
                <span className="agent">{alert.agent}</span>
                <span className="over-percent">{alert.percentOverBudget}% over</span>
                <span className="projection">${alert.projectedTotal}</span>
              </div>
            ))
          ) : (
            <p>No cost overruns</p>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Controls Panel Component
 */
const ControlsPanel: React.FC = () => {
  const [isIngestionPaused, setIsIngestionPaused] = useState(false);
  const [skills, setSkills] = useState<any[]>([]);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const response = await fetch('/api/skills');
        setSkills(await response.json());
      } catch (error) {
        console.error('Failed to fetch skills:', error);
      }
    };

    fetchSkills();
  }, []);

  const handlePauseIngestion = async () => {
    try {
      const reason = prompt('Pause reason:');
      if (reason) {
        await fetch('/api/ingestion/pause', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason, duration: 15 }),
        });
        setIsIngestionPaused(true);
      }
    } catch (error) {
      console.error('Failed to pause ingestion:', error);
    }
  };

  const handleResumeIngestion = async () => {
    try {
      await fetch('/api/ingestion/resume', {
        method: 'POST',
      });
      setIsIngestionPaused(false);
    } catch (error) {
      console.error('Failed to resume ingestion:', error);
    }
  };

  const handleInvokeSkill = async (skillId: string) => {
    try {
      const params = prompt('Parameters (JSON):');
      await fetch('/api/autonomy/proposals/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId, parameters: params ? JSON.parse(params) : {} }),
      });
      alert('Skill invoked. Awaiting governance approval.');
    } catch (error) {
      console.error('Failed to invoke skill:', error);
    }
  };

  const handleSnapshotExport = async () => {
    try {
      await fetch('/api/snapshot/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotType: 'all', format: 'tar.gz', includeLogs: true }),
      });
      alert('Snapshot export started.');
    } catch (error) {
      console.error('Failed to export snapshot:', error);
    }
  };

  const handleRestart = async () => {
    if (confirm('Restart entire CIC runtime? All services will be restarted.')) {
      try {
        await fetch('/api/restart', {
          method: 'POST',
        });
        alert('Runtime restart initiated. Check console for progress.');
      } catch (error) {
        console.error('Failed to restart:', error);
      }
    }
  };

  return (
    <div className="panel controls-panel">
      <div className="panel-title">Controls</div>

      <div className="controls-grid">
        <div className="control-group">
          <h3>Ingestion Control</h3>
          <button
            className={`control-btn ${isIngestionPaused ? 'paused' : 'running'}`}
            onClick={isIngestionPaused ? handleResumeIngestion : handlePauseIngestion}
          >
            {isIngestionPaused ? 'RESUME' : 'PAUSE'}
          </button>
        </div>

        <div className="control-group">
          <h3>Skill Invocation</h3>
          <select onChange={(e) => e.target.value && handleInvokeSkill(e.target.value)}>
            <option value="">Select a skill...</option>
            {skills.map((skill: any) => (
              <option key={skill.id} value={skill.id}>
                {skill.name}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <h3>State Management</h3>
          <button className="control-btn" onClick={handleSnapshotExport}>
            SNAPSHOT EXPORT
          </button>
          <button className="control-btn danger" onClick={handleRestart}>
            RESTART RUNTIME
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Main Planning Console Component
 */
const PlanningConsole: React.FC = () => {
  const [activePanel, setActivePanel] = useState<'health' | 'pipelines' | 'agents' | 'alerts' | 'controls'>('health');

  return (
    <div className="planning-console-v3">
      <div className="console-header">
        <h1>Operator Console v3</h1>
        <p>Phase 5a — CIC Runtime Control Center</p>
      </div>

      <div className="console-nav">
        <button
          className={activePanel === 'health' ? 'active' : ''}
          onClick={() => setActivePanel('health')}
        >
          Health
        </button>
        <button
          className={activePanel === 'pipelines' ? 'active' : ''}
          onClick={() => setActivePanel('pipelines')}
        >
          Pipelines
        </button>
        <button
          className={activePanel === 'agents' ? 'active' : ''}
          onClick={() => setActivePanel('agents')}
        >
          Agents
        </button>
        <button
          className={activePanel === 'alerts' ? 'active' : ''}
          onClick={() => setActivePanel('alerts')}
        >
          Alerts
        </button>
        <button
          className={activePanel === 'controls' ? 'active' : ''}
          onClick={() => setActivePanel('controls')}
        >
          Controls
        </button>
      </div>

      <div className="console-content">
        {activePanel === 'health' && <HealthPanel />}
        {activePanel === 'pipelines' && <PipelinesPanel />}
        {activePanel === 'agents' && <AgentsPanel />}
        {activePanel === 'alerts' && <AlertsPanel />}
        {activePanel === 'controls' && <ControlsPanel />}
      </div>
    </div>
  );
};

export default PlanningConsole;
