/**
 * CIC Operator Console v3 — Panel Library
 *
 * Tier 1: Core monitoring (3 panels)
 * - HealthPanel: System health, uptime, services, last error
 * - PipelinesPanel: Running pipelines with progress and ETA
 * - ControlsPanel: Action buttons and toggle switches
 *
 * Tier 2: Extended monitoring (3 panels)
 * - AgentsPanel: Active agents with CPU, memory, uptime
 * - AlertsPanel: System alerts, warnings, errors
 * - WorkspacePanel: User info, permissions, activity log
 *
 * All panels are 100% compliant with CIC Design System v1.0.
 * All styling uses cic.cls token helpers (no hardcoded colors/spacing).
 */

// Tier 1
export { HealthPanel }    from './HealthPanel';
export { PipelinesPanel } from './PipelinesPanel';
export { ControlsPanel }  from './ControlsPanel';

// Tier 2
export { AgentsPanel }   from './AgentsPanel';
export { AlertsPanel }   from './AlertsPanel';
export { WorkspacePanel } from './WorkspacePanel';
