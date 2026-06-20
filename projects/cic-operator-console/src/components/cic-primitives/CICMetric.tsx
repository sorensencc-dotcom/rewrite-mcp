import React from 'react';

export interface CICMetricProps {
  label: string;
  value: string | number;
  unit?: string;
  description?: string;
  /** Filled progress bar 0–100 */
  progress?: number;
  /** Color tone for progress bar */
  progressTone?: 'accent' | 'success' | 'warning' | 'error';
  className?: string;
}

const PROGRESS_CLS: Record<string, string> = {
  accent:  'bg-indigo-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  error:   'bg-red-500',
};

/**
 * CICMetric — extended metric display with optional progress bar.
 * Designed for resource utilization, quota, and capacity panels.
 */
export function CICMetric({
  label,
  value,
  unit,
  description,
  progress,
  progressTone = 'accent',
  className = '',
}: CICMetricProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider font-['Inter',system-ui,sans-serif]">
          {label}
        </span>
        <div className="flex items-baseline gap-1 shrink-0">
          <span className="text-lg font-bold text-slate-100 font-['JetBrains_Mono','Fira_Code',monospace] tabular-nums">
            {value}
          </span>
          {unit && <span className="text-xs text-slate-500 font-mono">{unit}</span>}
        </div>
      </div>

      {progress !== undefined && (
        <div className="w-full bg-[#1e1e2a] rounded-full h-1.5 overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${PROGRESS_CLS[progressTone]}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}

      {description && (
        <p className="text-xs text-slate-600 font-['Inter',system-ui,sans-serif] leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
