import { CICText, CICBadge } from '../../../components/cic-primitives';
import { cic } from '../../../tokens/cic-tokens';
import type { ExecutionLogEntry } from '../types';

interface AgentExecutionLogProps {
  logs: ExecutionLogEntry[];
}

/**
 * AgentExecutionLog — Streaming execution events
 * Shows execution history with input/output hashes, drift, duration, errors
 */
export function AgentExecutionLog({ logs }: AgentExecutionLogProps) {
  if (!logs.length) {
    return (
      <CICText variant="body-sm" className={cic.cls.textMuted}>
        No executions yet.
      </CICText>
    );
  }

  return (
    <div className={`${cic.cls.border} rounded overflow-x-auto max-h-96 overflow-y-auto`}>
      <table className="text-xs w-full">
        <thead className={cic.cls.bgMuted}>
          <tr>
            <th className="text-left p-2">Timestamp</th>
            <th className="text-left p-2">Duration</th>
            <th className="text-left p-2">Drift</th>
            <th className="text-left p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {logs.slice().reverse().map(log => (
            <tr key={log.id} className={`border-t ${cic.cls.borderColor}`}>
              <td className="p-2">{new Date(log.timestamp).toLocaleTimeString()}</td>
              <td className="p-2">{log.durationMs}ms</td>
              <td className="p-2">{log.driftScore.toFixed(2)}</td>
              <td className="p-2">
                {log.error ? (
                  <CICBadge variant="error" size="xs">
                    Error
                  </CICBadge>
                ) : (
                  <CICBadge variant="success" size="xs">
                    OK
                  </CICBadge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {logs.some(l => l.error) && (
        <div className="p-2 border-t mt-2">
          <CICText variant="label-xs" className={cic.cls.textMuted}>
            Last Error
          </CICText>
          <div className={`${cic.cls.fontMono} text-xs mt-1 text-red-600 overflow-x-auto max-w-full`}>
            {logs.find(l => l.error)?.error}
          </div>
        </div>
      )}
    </div>
  );
}
