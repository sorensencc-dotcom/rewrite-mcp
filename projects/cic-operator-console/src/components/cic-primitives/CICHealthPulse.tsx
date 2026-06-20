import React from 'react';

export type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'unknown' | 'offline';

export interface CICHealthPulseProps {
  status: HealthStatus;
  label?: string;
  /** Show pulsing ring animation. Default: true for healthy/degraded */
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const STATUS_CONFIG: Record<HealthStatus, { dot: string; ring: string; text: string; label: string }> = {
  healthy:  { dot: 'bg-green-400',  ring: 'bg-green-400/30',  text: 'text-green-400',  label: 'Healthy'  },
  degraded: { dot: 'bg-amber-400',  ring: 'bg-amber-400/30',  text: 'text-amber-400',  label: 'Degraded' },
  critical: { dot: 'bg-red-400',    ring: 'bg-red-400/30',    text: 'text-red-400',    label: 'Critical' },
  unknown:  { dot: 'bg-slate-500',  ring: 'bg-slate-500/30',  text: 'text-slate-500',  label: 'Unknown'  },
  offline:  { dot: 'bg-slate-700',  ring: 'bg-transparent',   text: 'text-slate-600',  label: 'Offline'  },
};

const DOT_SIZE: Record<string, string> = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

const RING_SIZE: Record<string, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const TEXT_SIZE: Record<string, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

/**
 * CICHealthPulse — animated health status indicator.
 * Used in service health panels, nav indicators, and status dashboards.
 * All colors locked to CIC tokens; no direct color overrides.
 */
export function CICHealthPulse({ status, label, pulse, size = 'md', className = '' }: CICHealthPulseProps) {
  const cfg = STATUS_CONFIG[status];
  const shouldPulse = pulse ?? (status === 'healthy' || status === 'degraded');

  return (
    <div className={`inline-flex items-center gap-2 ${className}`} role="status" aria-label={`${label ?? cfg.label}: ${status}`}>
      {/* Dot with optional pulse ring */}
      <div className="relative flex items-center justify-center shrink-0">
        {shouldPulse && status !== 'offline' && (
          <span
            className={`absolute inline-flex rounded-full ${RING_SIZE[size]} ${cfg.ring} animate-ping opacity-75`}
            aria-hidden="true"
          />
        )}
        <span className={`relative inline-block rounded-full ${DOT_SIZE[size]} ${cfg.dot}`} aria-hidden="true" />
      </div>

      {label !== undefined && (
        <span className={`font-medium font-['Inter',system-ui,sans-serif] ${TEXT_SIZE[size]} ${cfg.text}`}>
          {label}
        </span>
      )}
    </div>
  );
}
