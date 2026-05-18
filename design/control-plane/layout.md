# Control Plane — Layout Specification
# File: design/control-plane/layout.md | Version: 1.0.0 | Date: 2026-05-15

## Design Philosophy

Operator-grade: maximum information density, zero decorative chrome. Every pixel serves
a function. Dark background reduces eye fatigue during long sessions. Monospace for all
data values; proportional for labels.

---

## Global Shell

```
┌──────────────────────────────────────────────────────────┐
│ HEADER  [logo/title]                 [status] [version]  │  height: 44px
├──────────────────────────────────────────────────────────┤
│ TAB BAR │ Pipelines │ Agents │ Runs │ Metrics │          │  height: 36px
├──────────────────────────────────────────────────────────┤
│                                                          │
│  MAIN CONTENT AREA  (active panel)                       │  flex: 1
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- No left nav. Tab bar is the only primary navigation.
- Header is fixed; main content scrolls independently.
- Total shell: `display: flex; flex-direction: column; height: 100vh`.

### Header

- Background: `colors.surface`
- Border-bottom: 1px solid `colors.surfaceBorder`
- Padding: `spacing.sm spacing.md`
- Title: `typography.heading.sizeMd`, `colors.textPrimary`
- Status badge: colored dot + label, right-aligned
- Version: `typography.mono.size`, `colors.textMuted`

### Tab Bar

- Background: `colors.bg`
- Border-bottom: 1px solid `colors.surfaceBorder`
- Tabs: `typography.body.size`, `colors.textSecondary`
- Active tab: `colors.textPrimary` + bottom border 2px `colors.accent`
- Hover tab: `colors.textPrimary`
- Tab padding: `spacing.sm spacing.md`
- Transition: `transition.fast` on color

---

## Panel Layout (shared by all four panels)

Each panel follows a two-zone structure:

```
┌────────────────────────────────────────────────────┐
│ PANEL TOOLBAR  [filter/search inputs] [actions]    │  height: 44px
├──────────────────┬─────────────────────────────────┤
│                  │                                 │
│  LIST ZONE       │  DETAIL ZONE                    │
│  (master)        │  (slave, optional)              │
│                  │                                 │
│  Scrollable      │  Scrollable, hidden by default  │
│                  │                                 │
└──────────────────┴─────────────────────────────────┘
```

- List zone: `min-width: 320px`, `flex: 0 0 auto` when detail open; `flex: 1` when closed
- Detail zone: `flex: 1`, slides in on row click, hidden by default
- Splitter: implicit — detail zone opens via CSS class toggle, no drag resize
- Both zones scroll independently on Y axis

### List / Table

- Full-width table, no outer border
- Row height: 36px
- Header row: `colors.surfaceRaised`, `typography.heading.sizeSm`, uppercase, `colors.textSecondary`
- Data row: `colors.surface` alternate `colors.bg`, `typography.body`
- Selected row: `colors.accentMuted` background, left border 3px `colors.accent`
- Hover row: `colors.surfaceRaised`
- Column values: monospace for IDs, timestamps, durations; proportional for names/statuses

### Detail Pane

- Background: `colors.surfaceRaised`
- Left border: 1px solid `colors.surfaceBorder`
- Padding: `spacing.md`
- Close button: top-right, `colors.textMuted`
- Sections: labeled blocks with `colors.textSecondary` section headings
- Log block: `colors.bg`, `typography.mono`, `spacing.sm` padding, scrollable, max-height: 300px

### Status Pills

| Status      | bg color         | text color       |
|-------------|------------------|------------------|
| running     | `accentMuted`    | `accent`         |
| completed   | `successMuted`   | `success`        |
| failed      | `dangerMuted`    | `danger`         |
| pending     | `warningMuted`   | `warning`        |
| idle        | `surface`        | `textMuted`      |

---

## Panel-Specific Layout Notes

### Pipelines Panel

- Columns: Name | Version | Nodes | Last Run | Last Status | Actions
- Actions column: "▶ Run" button per row
- Detail pane: DAG node list, last 5 runs summary, trigger form with payload textarea

### Agents Panel

- Columns: Name | Version | Type | Referenced By (pipeline count)
- Detail pane: capabilities list, execute signature, referencing pipelines

### Runs Panel

- Columns: Run ID (truncated) | Pipeline | Status | Duration | Started | User
- Filter toolbar: pipeline dropdown, status multi-select, time-window selector
- Detail pane: inputs JSON, outputs JSON, structured log stream, timing waterfall

### Metrics Panel

- No master/slave split. Full-width chart grid.
- Grid: 2-column at >1200px, 1-column below
- Charts: Latency P50/P95 (line), Throughput req/s (bar), Error rate % (line), Run counts by pipeline (stacked bar)
- Time selector: 1h / 6h / 24h / 7d (top-right)
- All charts use canvas; no external charting library required (native Canvas API)

---

## Responsive Behavior

| Breakpoint  | Behavior                                                      |
|-------------|---------------------------------------------------------------|
| ≥ 1440px    | Full layout as specified                                      |
| 1024–1439px | Detail pane overlays (absolute) rather than pushes list       |
| 768–1023px  | Tab labels abbreviated; detail pane is full-screen modal      |
| < 768px     | Not a primary target; single-column, scrollable, no charts    |

Desktop-first. Mobile gracefully degrades but is not a supported workflow.

---

## Accessibility Baseline

- All interactive elements keyboard-focusable (tab order follows DOM)
- Focus rings: 2px outline `colors.accent`, offset 2px
- Minimum touch/click target: 32×32px
- Color-only status: always paired with text label
- ARIA roles: `role="tablist"`, `role="tab"`, `role="tabpanel"` on nav structure
