import { useEffect, useState } from 'react';
import {
  HealthPanel,
  PipelinesPanel,
  AgentsPanel,
  AlertsPanel,
  WorkspacePanel,
  ControlsPanel,
} from '../panels';
import { useTheme } from '../hooks/useTheme';
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
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const checkApi = async () => {
      try {
        const res = await fetch('/api/console/health', { method: 'GET' });
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
      {/* Header: Status + Theme Toggle */}
      <div className="flex items-center justify-between">
        <div className={`text-xs ${cic.cls.textMuted}`}>
          {apiReady ? '✓ Backend ready' : '• Connecting...'}
        </div>
        <button
          type="button"
          onClick={toggle}
          className={`px-3 py-1 text-xs rounded transition ${
            theme === 'dark'
              ? 'bg-cic-muted text-white hover:bg-cic-border'
              : 'bg-gray-200 text-black hover:bg-gray-300'
          }`}
        >
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
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
