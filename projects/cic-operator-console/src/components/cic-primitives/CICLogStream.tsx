import React, { useEffect, useRef } from 'react';

export interface CICLogLine {
  id: string;
  timestamp?: string;
  level?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  message: string;
}

export interface CICLogStreamProps {
  lines: CICLogLine[];
  /** Auto-scroll to newest line. Default: true */
  autoScroll?: boolean;
  maxLines?: number;
  className?: string;
  /** Height of log viewport. Default: h-64 */
  heightClass?: string;
}

const LEVEL_CLS: Record<string, string> = {
  DEBUG: 'text-slate-600',
  INFO:  'text-slate-400',
  WARN:  'text-amber-400',
  ERROR: 'text-red-400',
  FATAL: 'text-red-300 font-bold',
};

/**
 * CICLogStream — scrollable, auto-tailing log display.
 * Renders monospace log lines with level-aware color coding.
 * All colors from CIC tokens — never add raw color values here.
 */
export function CICLogStream({
  lines,
  autoScroll = true,
  maxLines = 500,
  className = '',
  heightClass = 'h-64',
}: CICLogStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const displayed = lines.slice(-maxLines);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [lines, autoScroll]);

  return (
    <div
      className={`bg-[#0a0a0f] border border-[#2a2a3a] rounded-md overflow-auto ${heightClass} ${className}`}
      role="log"
      aria-live="polite"
      aria-label="Log stream"
    >
      <div className="p-3 space-y-0.5">
        {displayed.map((line) => (
          <div key={line.id} className="flex gap-2 text-xs font-['JetBrains_Mono','Fira_Code',monospace] leading-relaxed">
            {line.timestamp && (
              <span className="text-slate-700 shrink-0 select-none">{line.timestamp}</span>
            )}
            {line.level && (
              <span className={`w-10 shrink-0 uppercase text-right ${LEVEL_CLS[line.level] ?? 'text-slate-400'}`}>
                {line.level}
              </span>
            )}
            <span className="text-slate-300 break-all">{line.message}</span>
          </div>
        ))}

        {displayed.length === 0 && (
          <span className="text-xs text-slate-700 font-mono">Waiting for log output...</span>
        )}

        <div ref={bottomRef} aria-hidden="true" />
      </div>
    </div>
  );
}
