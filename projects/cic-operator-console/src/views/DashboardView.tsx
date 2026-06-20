import { useEffect, useState } from 'react';
import {
  HealthPanel,
  PipelinesPanel,
  AgentsPanel,
  AlertsPanel,
  WorkspacePanel,
  ControlsPanel,
} from '../panels';
import { CICGrid } from '../components/cic-primitives';
import { cic } from '../tokens/cic-tokens';

/**
 * DashboardView — Console v3 Main Layout
 *
 * Composition:
 * - Tier 1 (top): HealthPanel (60%) | PipelinesPanel (40%)
 * - Tier 2 (middle): AgentsPanel (33%) | AlertsPanel (33%) | WorkspacePanel (33%)
 * - Controls (bottom): ControlsPanel (100%)
 *
 * All panels refresh on their own intervals.
 * All styling uses CIC Design System v1.0 tokens (100% compliant).
 */
export function DashboardView() {
  const [apiReady, setApiReady] = useState(false);

  useEffect(() => {
    // Quick health check to confirm backend is available
    const checkApi = async () => {
      try {
        const res = await fetch('/api/cic/health', { method: 'GET' });
        if (res.ok) {
          setApiReady(true);
        }
      } catch {
        // Backend not ready yet, but panels will handle individually
        setApiReady(false);
      }
    };

    void checkApi();
  }, []);

  return (
    <div className={`min-h-screen ${cic.cls.bg} p-4`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${cic.cls.textPrimary}`}>
          CIC Operator Console v3
        </h1>
        <p className={`text-sm ${cic.cls.textMuted} mt-1`}>
          {apiReady ? 'Backend connected' : 'Connecting to backend...'}
        </p>
      </div>

      {/* Tier 1: Health + Pipelines (60 / 40) */}
      <div className="mb-4 grid grid-cols-5 gap-4">
        <div className="col-span-3">
          <HealthPanel />
        </div>
        <div className="col-span-2">
          <PipelinesPanel />
        </div>
      </div>

      {/* Tier 2: Agents + Alerts + Workspace (33 / 33 / 33) */}
      <div className="mb-4 grid grid-cols-3 gap-4">
        <AgentsPanel />
        <AlertsPanel />
        <WorkspacePanel />
      </div>

      {/* Controls (100%) */}
      <div>
        <ControlsPanel />
      </div>
    </div>
  );
}
