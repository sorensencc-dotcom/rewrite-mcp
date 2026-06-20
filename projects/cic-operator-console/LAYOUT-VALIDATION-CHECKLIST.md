# Console v3 Layout Validation Checklist

Use this checklist to verify the dashboard layout and styling after running the mock API server.

## Setup

- [ ] `node mock-api-server.js` running on localhost:8080
- [ ] `npm run dev` running on localhost:5173
- [ ] Browser open to http://localhost:5173/console-v3
- [ ] Status indicator shows "✓ Backend ready" (not "• Connecting...")

## Tier 1: Health (60%) + Pipelines (40%)

### Layout
- [ ] Health panel on left (wider)
- [ ] Pipelines panel on right (narrower)
- [ ] Panels are same height
- [ ] 4px gap between panels
- [ ] No wrapping to next row

### Health Panel Content
- [ ] Title: "CIC Health"
- [ ] Status badge (green/yellow/red) visible
- [ ] 4 metrics displayed: Status, Uptime %, Services, Last Error
- [ ] Last Error shows "None" or timestamp (never empty)
- [ ] Uptime % is around 99%
- [ ] Active Services count (18–22 range)

### Pipelines Panel Content
- [ ] Title: "Pipelines"
- [ ] 1–3 pipeline items listed
- [ ] Each pipeline shows: name, ETA, status badge
- [ ] Statuses: running (blue dot), paused, error (red), complete (green)
- [ ] ETA formats correctly: "2m 15s", "45s", "—"
- [ ] Progress bar visible under each pipeline name

## Tier 2: Agents (33%) + Alerts (33%) + Workspace (33%)

### Layout
- [ ] Three panels side-by-side (equal width)
- [ ] Same height as each other
- [ ] Below Tier 1 panels
- [ ] 4px gap between each

### Agents Panel
- [ ] Title: "Agents"
- [ ] Status summary showing: online count, degraded, offline, total
- [ ] Agent list visible (3 agents minimum)
- [ ] Each agent shows: name, status (online/degraded/offline), latency (80–150ms), cost ($0.2–0.5)
- [ ] Can click agent to see detail view

### Alerts Panel
- [ ] Title: "Alerts"
- [ ] 2–4 alerts visible
- [ ] Severity colors: blue (info), orange (warning), red (error), red-bold (critical)
- [ ] Each alert: severity icon, title, message, timestamp (relative: "5m ago")
- [ ] Scrollable if >96px tall
- [ ] No alerts → shows "No active alerts."

### Workspace Panel
- [ ] Title: "Workspace"
- [ ] User section: name, email, role (Chris Sorensen, sorensencc@gmail.com, Operator)
- [ ] Permissions list: cic:read✓, cic:execute✓, cic:approve✓, agents:invoke✓, vault:write✓
- [ ] Activity log: 3 recent actions with timestamps

## Controls: 100% Width (Bottom)

### Layout
- [ ] Full width of console
- [ ] Below Tier 2 panels
- [ ] Separated from panels by gap

### Buttons
- [ ] "Start Phase" button
- [ ] "Pause" button
- [ ] "Resume" button
- [ ] "Reset" button
- [ ] Buttons responsive on click

### Toggles
- [ ] Debug Mode toggle (unchecked by default)
- [ ] Auto-scale toggle (checked by default)
- [ ] Toggles respond visually to clicks

## Styling & CIC Design System

### Colors
- [ ] Background: dark slate/charcoal (not pure black)
- [ ] Text: light gray (not white)
- [ ] Muted text: medium gray
- [ ] Accent: bright blue (for active/running states)
- [ ] Success: green (complete pipelines)
- [ ] Warning: orange (paused/degraded)
- [ ] Error: red (failures)
- [ ] No hardcoded `#rgb` or `rgb()` colors in browser DevTools

### Spacing
- [ ] Panel padding: consistent (looks like 16–20px)
- [ ] Gap between panels: consistent (looks like 16px)
- [ ] Gap between rows: consistent

### Typography
- [ ] Titles: bold, sans-serif, ~14px
- [ ] Body text: normal, sans-serif, ~13px
- [ ] Monospace text: in latency/timestamp fields (code font visible)
- [ ] No serif fonts

### Borders & Elevation
- [ ] Panels have subtle border (dark gray)
- [ ] Panels have shadow/elevation (very subtle)
- [ ] Status badges have rounded corners
- [ ] Alert items have left-side accent bar (matching severity color)

## Polling & Interactivity

### Refresh Behavior
- [ ] Health data updates every ~10s (check Devtools Network)
- [ ] Pipelines data updates every ~5s
- [ ] Alerts data updates every ~3s
- [ ] Agents data updates every ~5s
- [ ] No console errors during polling

### User Actions
- [ ] Click agent name → switches detail view
- [ ] Click "Start Phase" → shows "Phase execution started" message
- [ ] Click "Pause" → shows "Pipeline paused" message
- [ ] Click Debug Mode toggle → toggles visual state
- [ ] Click Auto-scale toggle → toggles visual state

## Error States

### Test Error Handling
- [ ] Stop mock server
- [ ] Reload dashboard
- [ ] Should show error messages (not blank panels)
- [ ] Restart mock server
- [ ] Dashboard recovers automatically (next polling cycle)

## Browser & Performance

### Console (DevTools)
- [ ] No JavaScript errors
- [ ] No warnings about deprecated APIs
- [ ] No 404s for /api/* requests

### Network (DevTools)
- [ ] All requests to /api/* return 200
- [ ] Response times <100ms
- [ ] Response sizes reasonable (~1–5KB per request)

### Performance (DevTools)
- [ ] Page loads <2s
- [ ] No layout shift (CLS: 0)
- [ ] Panels render smoothly without flicker

## Sign-Off

- [ ] All checks pass
- [ ] Dashboard is layout-stable and ready for real data
- [ ] No design token violations found
- [ ] Ready for TorqueQuery integration

**Next Steps:** Wire real agent list + alerts → TorqueQuery feed, add WebSocket streaming
