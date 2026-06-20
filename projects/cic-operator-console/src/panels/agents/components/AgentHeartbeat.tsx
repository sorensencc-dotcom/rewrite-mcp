import { CICGrid, CICStat } from '../../../components/cic-primitives';
import type { AgentHeartbeat as AgentHeartbeatType } from '../types';

interface AgentHeartbeatProps {
  heartbeat: AgentHeartbeatType;
}

/**
 * AgentHeartbeat — Real-time pulse data
 * Displays latency, queue depth, health, last pulse
 */
export function AgentHeartbeat({ heartbeat }: AgentHeartbeatProps) {
  const healthTone = heartbeat.health === 'online' ? 'success' : heartbeat.health === 'degraded' ? 'warning' : 'error';

  return (
    <div>
      <CICGrid cols={2} gap={4}>
        <CICStat
          label="Latency"
          value={heartbeat.latencyMs}
          unit="ms"
          tone={heartbeat.latencyMs < 100 ? 'success' : heartbeat.latencyMs < 500 ? 'warning' : 'error'}
        />
        <CICStat
          label="Queue Depth"
          value={heartbeat.queueDepth}
          tone={heartbeat.queueDepth === 0 ? 'success' : heartbeat.queueDepth < 10 ? 'warning' : 'error'}
        />
        <CICStat
          label="Health"
          value={heartbeat.health}
          tone={healthTone}
        />
        <CICStat
          label="Last Pulse"
          value={new Date(heartbeat.lastPulse).toLocaleTimeString()}
          tone="accent"
        />
      </CICGrid>
    </div>
  );
}
