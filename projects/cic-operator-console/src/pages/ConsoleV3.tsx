import { HealthPanel, PipelinesPanel, ControlsPanel } from '../panels';

/**
 * ConsoleV3 — Tier 1 dashboard layout
 *
 * ┌──────────────────────────────────────┐
 * │ Health (60%)  │ Pipelines (40%)      │
 * ├──────────────────────────────────────┤
 * │ Controls (100%)                      │
 * └──────────────────────────────────────┘
 *
 * Uses CSS grid via Tailwind classes only — no inline styles, no hardcoded colors.
 */
export default function ConsoleV3() {
  return (
    <div className="p-6 flex flex-col gap-4 min-h-0">
      {/* Top row: Health 60% + Pipelines 40% */}
      <div className="grid grid-cols-5 gap-4">
        <HealthPanel className="col-span-3" />
        <PipelinesPanel className="col-span-2" />
      </div>

      {/* Bottom row: Controls full width */}
      <ControlsPanel />
    </div>
  );
}
