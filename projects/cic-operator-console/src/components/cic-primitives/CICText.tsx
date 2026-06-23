import React from 'react';

export interface CICTextProps {
  children: React.ReactNode;
  variant?: 'body' | 'caption' | 'label';
  as?: 'p' | 'span' | 'div';
}

export const CICText: React.FC<CICTextProps> = ({
  children,
  variant = 'body',
  as: Component = 'p',
}) => {
  const className = {
    body: 'text-sm text-cic-text-primary',
    caption: 'text-xs text-cic-text-secondary',
    label: 'text-xs font-semibold text-cic-text-primary',
  }[variant];

  return <Component className={className}>{children}</Component>;
};
