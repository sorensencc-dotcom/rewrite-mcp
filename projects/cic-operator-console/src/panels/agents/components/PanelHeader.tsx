import {
  CICGrid,
  CICStat,
  CICButton,
  CICButtonGroup,
} from '../../../components/cic-primitives';
import { cic } from '../../../tokens/cic-tokens';
import type { StatusSummary } from '../types';

interface PanelHeaderProps {
  statusSummary: StatusSummary | null;
  loading: boolean;
  error: string | null;
  onInvoke: () => void;
  onPause: () => void;
  onRestart: () => void;
  onSnapshot: () => void;
}

/**
 * PanelHeader — Agent status summary + global controls
 * Displays counts (online/degraded/offline) and action buttons.
 */
export function PanelHeader({
  statusSummary,
  loading,
  error,
  onInvoke,
  onPause,
  onRestart,
  onSnapshot,
}: PanelHeaderProps) {
  return (
    <div className={`${cic.cls.spacingVertical} mb-6`}>
      {error && (
        <p className={`${cic.cls.error} text-xs ${cic.cls.fontMono} mb-4`}>
          {error}
        </p>
      )}

      {statusSummary && (
        <div className="mb-4">
          <CICGrid cols={4} gap={4}>
            <CICStat
              label="Online"
              value={statusSummary.online}
              tone="success"
            />
            <CICStat
              label="Degraded"
              value={statusSummary.degraded}
              tone="warning"
            />
            <CICStat
              label="Offline"
              value={statusSummary.offline}
              tone="error"
            />
            <CICStat
              label="Total"
              value={statusSummary.total}
              tone="accent"
            />
          </CICGrid>
        </div>
      )}

      <div className="flex gap-2">
        <CICButtonGroup>
          <CICButton
            variant="primary"
            size="sm"
            onClick={onInvoke}
            disabled={loading}
          >
            Invoke
          </CICButton>
          <CICButton
            variant="secondary"
            size="sm"
            onClick={onPause}
            disabled={loading}
          >
            Pause
          </CICButton>
          <CICButton
            variant="secondary"
            size="sm"
            onClick={onRestart}
            disabled={loading}
          >
            Restart
          </CICButton>
          <CICButton
            variant="secondary"
            size="sm"
            onClick={onSnapshot}
            disabled={loading}
          >
            Snapshot
          </CICButton>
        </CICButtonGroup>
      </div>
    </div>
  );
}
