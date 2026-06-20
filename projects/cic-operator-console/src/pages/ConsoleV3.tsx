import { useEffect, useState } from 'react';
import {
  HealthPanel,
  PipelinesPanel,
  AgentsPanel,
  AlertsPanel,
  WorkspacePanel,
  ControlsPanel,
} from '../panels';
import { cic } from '../tokens/cic-tokens';

/**
 * ConsoleV3 — Full operator console (Tier 1 + Tier 2)
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │ Health (60%)           │ Pipelines (40%)                    │
 * ├─────────────────────────────────────────────────────────────┤
 * │ Agents (33%) │ Alerts (33%) │ Workspace (33%)               │
 * ├─────────────────────────────────────────────────────────────┤
 * │ Controls (100%)                                             │
 * └─────────────────────────────────────────────────────────────┘
 *
 * All panels refresh independently via polling.
 * All styling uses CIC Design System v1.0 tokens (100% compliant).
 */
export default function ConsoleV3() {
  const [apiReady, setApiReady] = useState(false);

  useEffect(() => {
    const checkApi = async () => {
      try {
        const res = await fetch('/api/cic/health', { method: 'GET' });
        if (res.ok) {
          setApiReady(true);
        }
      } catch {
        setApiReady(false);
      }
    };

    void checkApi();
  }, []);

  return (
    <div className={`p-6 flex flex-col gap-4 min-h-0 ${cic.cls.bg}`}>
      {/* Status bar */}
      <div className={`text-xs ${cic.cls.textMuted}`}>
        {apiReady ? '✓ Backend ready' : '• Connecting...'}
      </div>

      {/* Tier 1: Health (60%) + Pipelines (40%) */}
      <div className="grid grid-cols-5 gap-4">
        <HealthPanel className="col-span-3" />
        <PipelinesPanel className="col-span-2" />
      </div>

      {/* Tier 2: Agents + Alerts + Workspace (33 / 33 / 33) */}
      <div className="grid grid-cols-3 gap-4">
        <AgentsPanel />
        <AlertsPanel />
        <WorkspacePanel />
      </div>

      {/* Controls (100%) */}
      <ControlsPanel />
    </div>
  );
}
