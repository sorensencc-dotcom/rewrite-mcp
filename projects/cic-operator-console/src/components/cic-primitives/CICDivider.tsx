import React from 'react';

export interface CICDividerProps {
  /** Label rendered centered on the divider */
  label?: string;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

/**
 * CICDivider — semantic separator with optional label.
 * Horizontal default; vertical mode for flex row containers.
 */
export function CICDivider({ label, orientation = 'horizontal', className = '' }: CICDividerProps) {
  if (orientation === 'vertical') {
    return (
      <div className={`w-px self-stretch bg-[#2a2a3a] mx-2 ${className}`} role="separator" aria-orientation="vertical" />
    );
  }

  if (label) {
    return (
      <div className={`flex items-center gap-3 my-4 ${className}`} role="separator">
        <div className="flex-1 h-px bg-[#2a2a3a]" />
        <span className="text-xs text-slate-600 font-mono uppercase tracking-widest shrink-0">{label}</span>
        <div className="flex-1 h-px bg-[#2a2a3a]" />
      </div>
    );
  }

  return (
    <hr className={`border-0 border-t border-[#2a2a3a] my-4 ${className}`} role="separator" />
  );
}
