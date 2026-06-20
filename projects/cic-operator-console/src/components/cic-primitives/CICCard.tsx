import React from 'react';

export interface CICCardProps {
  children: React.ReactNode;
  className?: string;
  /** Clickable card with hover state */
  onClick?: () => void;
  /** Highlight border color for status: 'default' | 'success' | 'warning' | 'error' | 'info' */
  status?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

const STATUS_BORDER: Record<string, string> = {
  default: 'border-[#2a2a3a]',
  success: 'border-green-500/40',
  warning: 'border-amber-500/40',
  error:   'border-red-500/40',
  info:    'border-blue-500/40',
};

/**
 * CICCard — secondary content card with optional status indicator.
 * Nests inside CICPanel or CICGrid cells.
 */
export function CICCard({ children, className = '', onClick, status = 'default' }: CICCardProps) {
  const interactive = onClick
    ? 'cursor-pointer hover:border-[#3a3a50] hover:bg-[#1e1e2a] transition-colors duration-150'
    : '';

  return (
    <div
      className={`bg-[#12121a] border rounded-md p-4 ${STATUS_BORDER[status]} ${interactive} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {children}
    </div>
  );
}
