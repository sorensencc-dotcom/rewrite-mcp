import React from 'react';

export interface CICGridProps {
  children: React.ReactNode;
  /** Number of columns. Default: 3 */
  cols?: 1 | 2 | 3 | 4 | 6 | 12;
  /** Gap size using CIC spacing scale. Default: 4 (16px) */
  gap?: 2 | 3 | 4 | 6 | 8;
  className?: string;
}

const COLS_CLS: Record<number, string> = {
  1:  'grid-cols-1',
  2:  'grid-cols-1 sm:grid-cols-2',
  3:  'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4:  'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  6:  'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  12: 'grid-cols-12',
};

const GAP_CLS: Record<number, string> = {
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  6: 'gap-6',
  8: 'gap-8',
};

/**
 * CICGrid — responsive grid layout container.
 * Use for stat rows, card grids, and panel layouts.
 */
export function CICGrid({ children, cols = 3, gap = 4, className = '' }: CICGridProps) {
  return (
    <div className={`grid ${COLS_CLS[cols]} ${GAP_CLS[gap]} ${className}`}>
      {children}
    </div>
  );
}
