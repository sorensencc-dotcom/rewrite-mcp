import React from 'react';
import { cicSpacing } from '@/tokens/cic-tokens';

export interface CICButtonGroupProps {
  children: React.ReactNode;
  gap?: string;
  orientation?: 'horizontal' | 'vertical';
}

export const CICButtonGroup: React.FC<CICButtonGroupProps> = ({
  children,
  gap = cicSpacing['3'],
  orientation = 'horizontal',
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: orientation === 'vertical' ? 'column' : 'row',
        gap,
        alignItems: orientation === 'vertical' ? 'stretch' : 'center',
      }}
    >
      {children}
    </div>
  );
};
