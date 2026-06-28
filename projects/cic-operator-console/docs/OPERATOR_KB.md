# CIC Operator Console Keyboard Reference

**Version:** 1.0.0  
**Status:** Phase 3.6 Stream B  
**Last Updated:** 2026-06-23

---

## Overview

The CIC Operator Console supports full keyboard-only navigation and control. All operator workflows can be completed without using a mouse. This guide documents all keyboard shortcuts and focus navigation patterns.

---

## Keyboard Shortcuts

### Health & Monitoring

| Shortcut | Action | Context |
|----------|--------|---------|
| **Ctrl+R** | Refresh Health Status | Triggers `POST /api/console/health` to refresh system health panel immediately (default: 10s polling) |

### Pipeline Control

| Shortcut | Action | Context |
|----------|--------|---------|
| **P, 1** | Pause/Restart Pipeline 1 | Toggles pause state on pipeline #1 |
| **P, 2** | Pause/Restart Pipeline 2 | Toggles pause state on pipeline #2 |
| **P, N** | Pause/Restart Pipeline N | Toggles pause state on pipeline #N (where N = 1–9) |

**Example:** Press P, then 2 to pause/restart pipeline 2.

### Alert Management

| Shortcut | Action | Context |
|----------|--------|---------|
| **A** | Acknowledge Alert | Acknowledges the currently focused alert; marks as read and removes from active alerts list |

**Focus first:** Use Tab to navigate to the target alert, then press A to acknowledge.

### Navigation & Search

| Shortcut | Action | Context |
|----------|--------|---------|
| **/** | Focus Search Input | Moves keyboard focus to the search box (if available); clears previous search and positions cursor |
| **[** | Previous Panel | Moves focus to the previous panel in tab order (with wraparound) |
| **]** | Next Panel | Moves focus to the next panel in tab order (with wraparound) |

**Example:** Press `/` to search, type a pipeline name, then press Enter to filter.

---

## Focus Navigation (Tab Order)

The console follows a logical left-to-right, top-to-bottom tab order:

```
Tier 1 (Top Row)
  ├─ Health Panel (left)
  └─ Pipelines Panel (right)

Tier 2 (Middle Row)
  ├─ Agents Panel (left)
  ├─ Alerts Panel (center)
  └─ Workspace Panel (right)

Controls (Bottom Row)
  └─ Action Buttons & Toggles
```

### Using Tab to Navigate

1. **Forward navigation:** Press Tab to move to the next interactive element
2. **Backward navigation:** Press Shift+Tab to move to the previous interactive element
3. **Within a panel:** Tab cycles through all buttons, inputs, and links inside that panel
4. **Across panels:** After the last element in a panel, Tab moves to the first element in the next panel

**Example Tab Sequence:**
```
1. Health Panel → Refresh Button
2. Pipelines Panel → First Pause Button
3. Pipelines Panel → Second Pause Button
...
N. Controls Panel → Start Phase Button
N+1. Controls Panel → Pause Button
N+2. Controls Panel → Debug Mode Toggle
...
```

### Escaping Focus Traps

If focus becomes trapped in a modal or popover:
- Press **Escape** to close the modal and return focus to the element that opened it

---

## Panel-Specific Keyboard Controls

### Health Panel

| Element | Keyboard Access |
|---------|-----------------|
| Refresh Button | Tab to focus, Enter/Space to click |
| Status Badge | Display only (not focusable) |
| Metrics (Uptime, Services) | Display only (not focusable) |

**Power User Tip:** Use Ctrl+R for quick refresh without tabbing.

### Pipelines Panel

| Element | Keyboard Access |
|---------|-----------------|
| Pause Buttons | Tab to focus, Enter/Space to click, or P+{N} shortcut |
| Restart Buttons | Tab to focus, Enter/Space to click, or P+{N} shortcut |
| Pipeline Status | Display only (not focusable) |

**Power User Tip:** Use P+1, P+2 etc. for rapid pipeline control without tabbing.

### Agents Panel

| Element | Keyboard Access |
|---------|-----------------|
| Agent List Rows | Tab to cycle through agents, Enter to expand details |
| Agent Name | Display only |
| Status Indicator | Display only |
| Details View | Accessible after expanding with Enter |

### Alerts Panel

| Element | Keyboard Access |
|---------|-----------------|
| Alert Rows | Tab to focus, Enter to view details |
| Severity Badge | Display only (not focusable) |
| Acknowledge Button (implicit) | Press A while alert is focused |

**Power User Tip:** Use Tab to navigate alerts, then press A to acknowledge without clicking.

### Workspace Panel

| Element | Keyboard Access |
|---------|-----------------|
| Settings | Tab to focus interactive elements |
| Toggles | Tab to focus, Space to toggle, Enter to toggle |

### Controls Panel

| Element | Keyboard Access |
|---------|-----------------|
| Start Phase Button | Tab to focus, Enter/Space to click |
| Pause Button | Tab to focus, Enter/Space to click |
| Resume Button | Tab to focus, Enter/Space to click |
| Reset Button | Tab to focus, Enter/Space to click (Danger action) |
| Debug Mode Toggle | Tab to focus, Space to toggle |
| Auto-scale Toggle | Tab to focus, Space to toggle |

---

## Screen Reader Announcements

When you use the Operator Console with a screen reader (NVDA, JAWS, VoiceOver), the following announcements are automatically made:

### Status Announcements (Polite)

- "Health check passed, 8 services operational"
- "Pipeline {name} now running, {task} in progress"
- "Agent {name} completed {action}"

These announcements do not interrupt your current activity.

### Alert Announcements (Assertive)

- "CRITICAL: {service} unresponsive, {duration}s down"
- "ERROR: {service} failed to start"

These announcements take priority and are announced immediately.

### Log Announcements (Polite)

- "{timestamp} — Pipeline execution started"
- "{timestamp} — Agent task completed successfully"

---

## Common Workflows

### Workflow 1: Quick Health Check & Refresh

```
1. Press Ctrl+R to refresh health status immediately
2. Read health panel announcement ("Health check passed...")
3. Continue with next task
```

**Time:** 2–3 seconds

### Workflow 2: Manage Multiple Pipelines

```
1. Use P+1, P+2, P+3 to pause/restart pipelines 1, 2, 3
2. No tabbing required—use keyboard shortcuts for rapid control
3. Monitor status in Pipelines Panel announcement
```

**Time:** 10–15 seconds for 3 pipelines

### Workflow 3: Review & Acknowledge Alerts

```
1. Press Tab repeatedly to navigate to Alerts Panel
2. Use Tab to focus each alert
3. Press A to acknowledge current alert
4. Repeat for all alerts
5. Use Tab to exit Alerts Panel
```

**Time:** 5–10 seconds per 5 alerts

### Workflow 4: Search for Agent

```
1. Press / to focus search input
2. Type agent name (e.g., "pr-reviewer")
3. Press Enter to filter agents
4. Press Tab to navigate filtered list
5. Press Escape to clear search
```

**Time:** 5–8 seconds

### Workflow 5: Navigate Between Panels

```
1. Use [ (left bracket) to move focus to previous panel
2. Use ] (right bracket) to move focus to next panel
3. Or use Tab to cycle through all elements sequentially
4. Wraparound: [ at leftmost panel moves to rightmost, ] at rightmost moves to leftmost
```

**Time:** 1–2 seconds per panel

---

## Accessibility Features

### Focus Visibility

- **Visual indicator:** Current focused element has a clear blue outline (or per your theme)
- **Screen reader:** Announces element type, label, and state

### Live Regions

- **Status updates:** Announced automatically without interrupting focus
- **Alerts:** Announced immediately with high priority
- **Log entries:** Last 3 entries displayed in log live region

### Keyboard-Only Navigation

- **No mouse required:** All controls accessible via Tab, Enter, Space, and keyboard shortcuts
- **No focus traps:** Escape key exits any modal/popover
- **Logical order:** Tab order follows visual layout (left→right, top→bottom)

### Color & Contrast

- **WCAG AA compliant:** All text has minimum 4.5:1 contrast ratio
- **Light & Dark themes:** Both themes tested for accessibility
- **Not color-dependent:** Status is indicated by more than color alone (icons, text, badges)

---

## Troubleshooting

### Focus is not moving when I press Tab

**Solution:** Ensure focus is within the console container. Click anywhere in the console first, then try Tab.

### Search input is not focusing with /

**Solution:** Ensure no text input is already focused. If a text field is focused, / inserts a character. Press Escape first, then try /.

### Shortcuts not working (P+N, A, Ctrl+R)

**Solution:** 
- Ensure console is in focus (click anywhere in console)
- For P+N: Press P, then quickly press the number (1–9)
- For A: Ensure an alert is focused (Tab to navigate to alerts)
- For Ctrl+R: This should work globally, even if focus is elsewhere

### Screen reader not announcing changes

**Solution:**
- Ensure screen reader is running (NVDA, JAWS, VoiceOver)
- Check browser console for errors (F12)
- Reload the page and try again
- For older screen readers, live region announcements may have a 1–2 second delay

---

## Keyboard Shortcut Reference (Quick Cheat Sheet)

```
MONITOR
  Ctrl+R ................ Refresh health status

PIPELINES
  P, 1 .................. Pause/restart pipeline 1
  P, 2 .................. Pause/restart pipeline 2
  P, N .................. Pause/restart pipeline N

ALERTS
  A ..................... Acknowledge focused alert

NAVIGATION
  / ..................... Focus search input
  [ ..................... Previous panel
  ] ..................... Next panel
  Tab ................... Next interactive element
  Shift+Tab ............ Previous interactive element
  Escape ............... Close modal, exit focus trap

CONTROLS
  Enter ................. Activate button/link
  Space ................. Toggle switch, activate button
```

---

## For Screen Reader Users

**Recommended setup:**
- **Screen Reader:** NVDA (Windows) or JAWS (Windows) or VoiceOver (macOS)
- **Browser:** Firefox (NVDA) or Chrome (JAWS/VoiceOver) or Safari (VoiceOver)
- **Keyboard Only:** Disable mouse to force keyboard-only workflow

**Launch Options:**
- **NVDA:** Windows key + Ctrl + N (if configured)
- **JAWS:** Windows key + Alt + N
- **VoiceOver:** Cmd + F5 (macOS)

Once your screen reader is running, navigate the console using Tab and keyboard shortcuts documented above.

---

## Feedback & Issues

If you encounter any keyboard navigation issues or screen reader bugs:

1. **Reproduce:** Note which panel/control and which keyboard action
2. **Report:** Include OS, browser, screen reader (if applicable), and steps to reproduce
3. **Escalate:** Contact ops-team@cic.ai or file issue in CIC Issue Tracker

---

## See Also

- **ACCESSIBILITY.md** — Full WCAG 2.1 AA compliance documentation
- **Console v3 Operator Guide** — General operator tasks and dashboards
- **CIC Design System** — Component documentation and token reference
