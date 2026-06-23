import { useState } from 'react';
import {
  CICPanel,
  CICGrid,
  CICButton,
  CICBadge,
} from '../components/cic-primitives';
import { cic } from '../tokens/cic-tokens';

// ── Types ─────────────────────────────────────────────────────────────────────

type ActionKind = 'start-phase' | 'pause' | 'resume' | 'reset';

interface ActionResult {
  success: boolean;
  message: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function postAction(action: ActionKind, payload?: Record<string, unknown>): Promise<ActionResult> {
  const res = await fetch('/api/console/actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    return { success: false, message: text };
  }
  const envelope = (await res.json()) as { status: string; data?: any; error?: any };
  if (envelope.status !== 'ok') {
    return { success: false, message: envelope.error?.message || 'Action failed' };
  }
  return { success: true, message: envelope.data?.message || 'Success' };
}

// ── Toggle ────────────────────────────────────────────────────────────────────

interface CICToggleProps {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

function CICToggle({ label, checked, onChange, disabled = false }: CICToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked ? 'true' : 'false'}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={[
        'flex items-center gap-3 px-4 py-2 rounded-md border transition-all duration-150',
        `${cic.cls.fontMono} text-sm`,
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        checked
          ? `${cic.cls.accentToggleBg} ${cic.cls.accentToggleBorder} ${cic.cls.accentToggleText}`
          : `${cic.cls.toggleBg} ${cic.cls.toggleBorder} ${cic.cls.textSecondary} hover:${cic.cls.textPrimary}`,
      ].join(' ')}
    >
      {/* Track */}
      <span
        className={[
          'relative inline-block w-9 h-5 rounded-full transition-colors duration-200',
          checked ? cic.cls.toggleTrackOn : cic.cls.toggleTrackOff,
        ].join(' ')}
        aria-hidden="true"
      >
        {/* Thumb */}
        <span
          className={[
            `absolute top-0.5 left-0.5 w-4 h-4 rounded-full ${cic.cls.toggleThumb} transition-transform duration-200`,
            checked ? 'translate-x-4' : 'translate-x-0',
          ].join(' ')}
        />
      </span>
      <span>{label}</span>
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * ControlsPanel — Console v3 Tier 1 (100% width, bottom)
 * Action buttons: Start Phase, Pause, Resume, Reset.
 * Toggle switches: Debug Mode, Auto-scale.
 * Data sink: POST /api/cic/actions.
 */
export function ControlsPanel({ className = '' }: { className?: string }) {
  const [loadingAction, setLoadingAction] = useState<ActionKind | null>(null);
  const [lastResult, setLastResult] = useState<ActionResult | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [autoScale, setAutoScale] = useState(true);

  async function handleAction(action: ActionKind) {
    setLoadingAction(action);
    setLastResult(null);
    try {
      const result = await postAction(action, { debugMode, autoScale });
      setLastResult(result);
    } catch (err) {
      setLastResult({
        success: false,
        message: err instanceof Error ? err.message : 'Request failed',
      });
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <CICPanel title="Controls" className={className}>
      <CICGrid cols={1} gap={4}>
        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <CICButton
            variant="primary"
            onClick={() => void handleAction('start-phase')}
            loading={loadingAction === 'start-phase'}
            disabled={loadingAction !== null && loadingAction !== 'start-phase'}
          >
            Start Phase
          </CICButton>
          <CICButton
            variant="secondary"
            onClick={() => void handleAction('pause')}
            loading={loadingAction === 'pause'}
            disabled={loadingAction !== null && loadingAction !== 'pause'}
          >
            Pause
          </CICButton>
          <CICButton
            variant="secondary"
            onClick={() => void handleAction('resume')}
            loading={loadingAction === 'resume'}
            disabled={loadingAction !== null && loadingAction !== 'resume'}
          >
            Resume
          </CICButton>
          <CICButton
            variant="danger"
            onClick={() => void handleAction('reset')}
            loading={loadingAction === 'reset'}
            disabled={loadingAction !== null && loadingAction !== 'reset'}
          >
            Reset
          </CICButton>
        </div>

        {/* Toggle switches */}
        <div className="flex flex-wrap items-center gap-3">
          <CICToggle
            label="Debug Mode"
            checked={debugMode}
            onChange={setDebugMode}
            disabled={loadingAction !== null}
          />
          <CICToggle
            label="Auto-scale"
            checked={autoScale}
            onChange={setAutoScale}
            disabled={loadingAction !== null}
          />
        </div>

        {/* Status display */}
        {lastResult && (
          <div className="flex items-center gap-2">
            <CICBadge variant={lastResult.success ? 'success' : 'error'}>
              {lastResult.success ? 'OK' : 'Error'}
            </CICBadge>
            <span className={`text-xs ${cic.cls.textSecondary} ${cic.cls.fontMono}`}>{lastResult.message}</span>
          </div>
        )}
      </CICGrid>
    </CICPanel>
  );
}
