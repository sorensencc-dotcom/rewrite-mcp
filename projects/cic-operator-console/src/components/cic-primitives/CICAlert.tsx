import React from 'react';

export interface CICAlertProps {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  onDismiss?: () => void;
  className?: string;
}

const VARIANT_CONFIG: Record<string, { bg: string; border: string; icon: string; titleCls: string; textCls: string }> = {
  info:    { bg: 'bg-blue-500/10',  border: 'border-blue-500/30',  icon: 'ℹ', titleCls: 'text-blue-300',  textCls: 'text-blue-200/80'  },
  success: { bg: 'bg-green-500/10', border: 'border-green-500/30', icon: '✓', titleCls: 'text-green-300', textCls: 'text-green-200/80' },
  warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: '⚠', titleCls: 'text-amber-300', textCls: 'text-amber-200/80' },
  error:   { bg: 'bg-red-500/10',   border: 'border-red-500/30',   icon: '✕', titleCls: 'text-red-300',   textCls: 'text-red-200/80'   },
};

/**
 * CICAlert — semantic alert/notification banner.
 * Variant drives all color via CIC tokens. No raw color classes outside this component.
 */
export function CICAlert({ children, variant = 'info', title, onDismiss, className = '' }: CICAlertProps) {
  const cfg = VARIANT_CONFIG[variant];

  return (
    <div className={`flex gap-3 p-3 rounded-md border ${cfg.bg} ${cfg.border} ${className}`} role="alert">
      <span className={`text-sm leading-none mt-0.5 select-none ${cfg.titleCls}`} aria-hidden="true">
        {cfg.icon}
      </span>
      <div className="flex-1 min-w-0">
        {title && (
          <p className={`text-sm font-semibold mb-1 font-['Inter',system-ui,sans-serif] ${cfg.titleCls}`}>
            {title}
          </p>
        )}
        <div className={`text-sm font-['Inter',system-ui,sans-serif] ${cfg.textCls}`}>
          {children}
        </div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}
