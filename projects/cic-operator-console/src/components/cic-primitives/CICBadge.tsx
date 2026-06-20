import React from 'react';

export interface CICBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

const VARIANT_CLS: Record<string, string> = {
  default: 'bg-slate-800 text-slate-400 border border-slate-700',
  success: 'bg-green-500/15 text-green-400 border border-green-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  error:   'bg-red-500/15 text-red-400 border border-red-500/30',
  info:    'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  accent:  'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
};

const DOT_CLS: Record<string, string> = {
  default: 'bg-slate-500',
  success: 'bg-green-400',
  warning: 'bg-amber-400',
  error:   'bg-red-400',
  info:    'bg-blue-400',
  accent:  'bg-indigo-400',
};

const SIZE_CLS: Record<string, string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-1 text-xs',
};

/**
 * CICBadge — status/label badge using CIC semantic color tokens.
 * Supports optional animated dot for live status.
 */
export function CICBadge({ children, variant = 'default', size = 'md', dot = false, className = '' }: CICBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded font-mono font-semibold uppercase tracking-wider',
        SIZE_CLS[size],
        VARIANT_CLS[variant],
        className,
      ].join(' ')}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_CLS[variant]} animate-pulse`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
