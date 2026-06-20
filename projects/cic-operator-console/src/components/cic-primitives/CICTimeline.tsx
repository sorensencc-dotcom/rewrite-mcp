import React from 'react';

export interface CICTimelineEvent {
  id: string;
  timestamp: string;
  label: string;
  description?: string;
  status?: 'success' | 'warning' | 'error' | 'info' | 'pending';
}

export interface CICTimelineProps {
  events: CICTimelineEvent[];
  maxItems?: number;
  className?: string;
}

const STATUS_DOT: Record<string, string> = {
  success: 'bg-green-400 ring-green-400/30',
  warning: 'bg-amber-400 ring-amber-400/30',
  error:   'bg-red-400 ring-red-400/30',
  info:    'bg-blue-400 ring-blue-400/30',
  pending: 'bg-slate-500 ring-slate-500/30 animate-pulse',
};

const STATUS_LABEL: Record<string, string> = {
  success: 'text-green-400',
  warning: 'text-amber-400',
  error:   'text-red-400',
  info:    'text-blue-400',
  pending: 'text-slate-500',
};

/**
 * CICTimeline — chronological event list with status dots.
 * Used for audit trails, phase history, and event logs.
 */
export function CICTimeline({ events, maxItems = 20, className = '' }: CICTimelineProps) {
  const displayed = events.slice(0, maxItems);

  return (
    <ol className={`relative space-y-0 ${className}`}>
      {displayed.map((event, idx) => (
        <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
          {/* Vertical connector line */}
          {idx < displayed.length - 1 && (
            <div className="absolute left-[7px] top-4 bottom-0 w-px bg-[#2a2a3a]" aria-hidden="true" />
          )}

          {/* Status dot */}
          <div
            className={`mt-1 w-3.5 h-3.5 rounded-full ring-4 shrink-0 ${STATUS_DOT[event.status ?? 'info']}`}
            aria-label={event.status ?? 'info'}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className={`text-xs font-semibold font-['Inter',system-ui,sans-serif] ${STATUS_LABEL[event.status ?? 'info']}`}>
                {event.label}
              </span>
              <time className="text-xs text-slate-600 font-mono shrink-0">{event.timestamp}</time>
            </div>
            {event.description && (
              <p className="mt-0.5 text-xs text-slate-500 font-['Inter',system-ui,sans-serif] leading-relaxed">
                {event.description}
              </p>
            )}
          </div>
        </li>
      ))}

      {events.length === 0 && (
        <li className="text-xs text-slate-600 font-mono py-2">No events recorded.</li>
      )}
    </ol>
  );
}
