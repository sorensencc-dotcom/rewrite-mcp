import React from 'react';

export interface CICPanelProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  elevated?: boolean;
  /** Optional header action slot */
  action?: React.ReactNode;
}

/**
 * CICPanel — top-level panel container with CIC surface styling.
 * Use for all dashboard panel sections. Never use raw <div> with bg/border.
 */
export function CICPanel({ children, title, className = '', elevated = false, action }: CICPanelProps) {
  const base = elevated
    ? 'bg-[#1e1e2a] border border-[#3a3a50] shadow-[0_4px_16px_rgba(0,0,0,0.6)]'
    : 'bg-[#17171f] border border-[#2a2a3a] shadow-[0_2px_8px_rgba(0,0,0,0.5)]';

  return (
    <div className={`rounded-lg ${base} ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a3a]">
          <span className="text-sm font-semibold text-slate-100 font-['Inter',system-ui,sans-serif] tracking-wide">
            {title}
          </span>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
