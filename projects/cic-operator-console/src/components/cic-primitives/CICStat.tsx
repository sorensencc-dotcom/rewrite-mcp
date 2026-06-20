import React from 'react';

export interface CICStatProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: { value: string | number; direction: 'up' | 'down' | 'flat' };
  /** Color theme for the value */
  tone?: 'default' | 'success' | 'warning' | 'error' | 'accent';
  className?: string;
}

const TONE_CLS: Record<string, string> = {
  default: 'text-slate-100',
  success: 'text-green-400',
  warning: 'text-amber-400',
  error:   'text-red-400',
  accent:  'text-indigo-400',
};

const DELTA_CLS: Record<string, string> = {
  up:   'text-green-400',
  down: 'text-red-400',
  flat: 'text-slate-500',
};

const DELTA_ICON: Record<string, string> = {
  up: '↑', down: '↓', flat: '→',
};

/**
 * CICStat — single metric display with optional delta indicator.
 * Use inside CICGrid or CICCard for key-value metric readouts.
 */
export function CICStat({ label, value, unit, delta, tone = 'default', className = '' }: CICStatProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-medium text-slate-500 font-['Inter',system-ui,sans-serif] uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl font-bold font-['JetBrains_Mono','Fira_Code',monospace] tabular-nums ${TONE_CLS[tone]}`}>
          {value}
        </span>
        {unit && (
          <span className="text-sm text-slate-500 font-mono">{unit}</span>
        )}
        {delta && (
          <span className={`text-xs font-semibold ml-1 ${DELTA_CLS[delta.direction]}`}>
            {DELTA_ICON[delta.direction]}{delta.value}
          </span>
        )}
      </div>
    </div>
  );
}
