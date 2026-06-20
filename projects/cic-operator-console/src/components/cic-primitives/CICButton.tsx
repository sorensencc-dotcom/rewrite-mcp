import React from 'react';

export interface CICButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

const VARIANT_CLS: Record<string, string> = {
  primary:   'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white border border-indigo-500/50 shadow-[0_0_12px_rgba(99,102,241,0.25)]',
  secondary: 'bg-[#1e1e2a] hover:bg-[#2a2a3a] active:bg-[#17171f] text-slate-200 border border-[#3a3a50]',
  ghost:     'bg-transparent hover:bg-[#1e1e2a] active:bg-[#12121a] text-slate-400 hover:text-slate-100 border border-transparent hover:border-[#2a2a3a]',
  danger:    'bg-red-900/40 hover:bg-red-800/50 active:bg-red-900/60 text-red-300 border border-red-500/30',
};

const SIZE_CLS: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs rounded',
  md: 'px-4 py-2 text-sm rounded-md',
  lg: 'px-6 py-3 text-base rounded-lg',
};

/**
 * CICButton — interactive button with CIC token-based styling.
 * All variants follow CIC color system. Never use raw <button> with inline styles.
 */
export function CICButton({
  children,
  onClick,
  variant = 'secondary',
  size = 'md',
  disabled = false,
  loading = false,
  type = 'button',
  className = '',
}: CICButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 font-medium',
        "font-['Inter',system-ui,sans-serif]",
        'transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]',
        VARIANT_CLS[variant],
        SIZE_CLS[size],
        (disabled || loading) ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
        className,
      ].join(' ')}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
