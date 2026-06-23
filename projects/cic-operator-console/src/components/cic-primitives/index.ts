/**
 * CIC Primitives — Gold Design System Component Library v1.0.0
 *
 * ALL panel-level UI must import from this barrel.
 * Importing directly from individual files is allowed but discouraged.
 *
 * Usage:
 *   import { CICPanel, CICCard, CICGrid, CICButton } from '@/components/cic-primitives';
 *
 * Design token access:
 *   import { cic, cicColor, cicSpacing } from '@/tokens/cic-tokens';
 */

// Layout
export { CICPanel }    from './CICPanel';
export { CICCard }     from './CICCard';
export { CICGrid }     from './CICGrid';
export { CICDivider }  from './CICDivider';

// Data Display
export { CICStat }     from './CICStat';
export { CICMetric }   from './CICMetric';
export { CICBadge }    from './CICBadge';

// Feedback / Status
export { CICAlert }       from './CICAlert';
export { CICHealthPulse } from './CICHealthPulse';

// Interactive
export { CICButton }      from './CICButton';
export { CICButtonGroup } from './CICButtonGroup';
export { CICTabs }        from './CICTabs';

// Text
export { CICText }        from './CICText';

// Streams / History
export { CICTimeline } from './CICTimeline';
export { CICLogStream } from './CICLogStream';

// Re-export types
export type { CICPanelProps }      from './CICPanel';
export type { CICCardProps }       from './CICCard';
export type { CICGridProps }       from './CICGrid';
export type { CICDividerProps }    from './CICDivider';
export type { CICStatProps }       from './CICStat';
export type { CICMetricProps }     from './CICMetric';
export type { CICBadgeProps }      from './CICBadge';
export type { CICAlertProps }      from './CICAlert';
export type { CICHealthPulseProps, HealthStatus } from './CICHealthPulse';
export type { CICButtonProps }        from './CICButton';
export type { CICButtonGroupProps }    from './CICButtonGroup';
export type { CICTabsProps, CICTabsListProps, CICTabsTriggerProps, CICTabsContentProps } from './CICTabs';
export type { CICTextProps } from './CICText';
export type { CICTimelineProps, CICTimelineEvent } from './CICTimeline';
export type { CICLogStreamProps, CICLogLine }      from './CICLogStream';
