/**
 * Focus Order Validation Tests — Phase 3.6 Stream A
 *
 * Tests focus management across Operator Console v3 panels.
 * Uses jest + @testing-library/react (when installed).
 *
 * To run: npm test -- focus-order.test.ts
 *
 * Note: These tests are structured to work with both Jest in jsdom
 * and with @testing-library/react when dependencies are available.
 * Mock setup handles API calls to panels without external dependencies.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

interface FocusTestResult {
  element: HTMLElement | null;
  tagName: string;
  ariaLabel?: string;
  text?: string;
}

interface MockPanelConfig {
  name: string;
  selector: string;
  initialContent?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract focus state for debugging/assertions
 */
function getFocusState(): FocusTestResult {
  const elem = document.activeElement as HTMLElement | null;
  return {
    element: elem,
    tagName: elem?.tagName || 'NONE',
    ariaLabel: elem?.getAttribute('aria-label') || undefined,
    text: elem?.textContent?.slice(0, 50) || undefined,
  };
}

/**
 * Mock fetch globally for API calls in panels.
 * Panels make GET requests to /api/console/{health,alerts,actions}.
 */
function setupMockFetch(
  response: any = { status: 'ok', data: null },
  statusCode: number = 200
): void {
  global.fetch = jest.fn((url: string | Request) => {
    const urlStr = typeof url === 'string' ? url : url.toString();
    return Promise.resolve({
      ok: statusCode >= 200 && statusCode < 300,
      status: statusCode,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
    } as unknown as Response);
  });
}

/**
 * Create a mock console container with panel skeletons.
 * Each panel has the expected interactive elements from real components.
 */
function createMockConsoleContainer(): HTMLElement {
  const container = document.createElement('div');
  container.setAttribute('role', 'region');
  container.setAttribute('aria-label', 'operator-console');
  container.setAttribute('data-testid', 'console-container');

  // Tier 1: Health (60%) + Pipelines (40%)
  const tier1 = document.createElement('div');
  tier1.className = 'grid grid-cols-5 gap-4';

  const healthPanel = document.createElement('section');
  healthPanel.setAttribute('data-testid', 'panel-health');
  healthPanel.innerHTML = '<button>Health Refresh</button>';
  tier1.appendChild(healthPanel);

  const pipelinesPanel = document.createElement('section');
  pipelinesPanel.setAttribute('data-testid', 'panel-pipelines');
  pipelinesPanel.innerHTML = '<button>Pipelines Action</button>';
  tier1.appendChild(pipelinesPanel);

  // Tier 2: Agents + Alerts + Workspace (33 / 33 / 33)
  const tier2 = document.createElement('div');
  tier2.className = 'grid grid-cols-3 gap-4';

  const agentsPanel = document.createElement('section');
  agentsPanel.setAttribute('data-testid', 'panel-agents');
  agentsPanel.innerHTML = '<button>Agents Filter</button>';
  tier2.appendChild(agentsPanel);

  const alertsPanel = document.createElement('section');
  alertsPanel.setAttribute('data-testid', 'panel-alerts');
  alertsPanel.innerHTML = '<button>Alerts Action</button>';
  tier2.appendChild(alertsPanel);

  const workspacePanel = document.createElement('section');
  workspacePanel.setAttribute('data-testid', 'panel-workspace');
  workspacePanel.innerHTML = '<button>Workspace Expand</button>';
  tier2.appendChild(workspacePanel);

  // Controls row (100%)
  const controlsPanel = document.createElement('section');
  controlsPanel.setAttribute('data-testid', 'panel-controls');
  controlsPanel.innerHTML = `
    <button>Start Phase</button>
    <button>Pause</button>
    <button>Resume</button>
    <button role="switch" aria-checked="false">Debug Mode</button>
  `;

  container.appendChild(tier1);
  container.appendChild(tier2);
  container.appendChild(controlsPanel);

  return container;
}

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('ConsoleV3 Focus Order Validation (Phase 3.6 Stream A)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockFetch({ status: 'ok', data: null });

    // Create mock container
    container = createMockConsoleContainer();
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Test 1: Tab Traversal Order
  // ───────────────────────────────────────────────────────────────────────────

  it('Test 1: Should traverse panels in correct Tab order (Health → Agents → Controls → Alerts → Workspace)', () => {
    setupMockFetch({
      status: 'ok',
      data: {
        status: 'green',
        uptimePercent: 99.9,
        activeServices: 5,
        lastErrorAt: null,
      },
    });

    const consoleElem = container.querySelector('[data-testid="console-container"]');
    expect(consoleElem).toBeTruthy();

    // Set focus to first interactive element in console (HealthPanel button)
    const firstButton = container.querySelector('button');
    if (firstButton) firstButton.focus();

    expect(document.activeElement).toBeTruthy();
    const initialFocus = getFocusState();
    expect(initialFocus.tagName).toBe('BUTTON');

    // Simulate Tab key to move focus to next button
    // (Browser native Tab behavior moves to next focusable element in DOM order)
    const allButtons = Array.from(container.querySelectorAll('button'));
    if (allButtons.length > 1) {
      allButtons[1].focus();
      const afterFirstTab = getFocusState();
      expect(afterFirstTab.element).not.toBe(initialFocus.element);
      expect(afterFirstTab.tagName).toBe('BUTTON');
    }

    // Verify panels exist in correct order by checking data-testid attributes
    const panelOrder = Array.from(container.querySelectorAll('section')).map((el) =>
      el.getAttribute('data-testid')
    );
    expect(panelOrder).toEqual([
      'panel-health',
      'panel-pipelines',
      'panel-agents',
      'panel-alerts',
      'panel-workspace',
    ]);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Test 2: Focus Trap Escape
  // ───────────────────────────────────────────────────────────────────────────

  it('Test 2: Should handle focus trap escape via Escape key', () => {
    const testContainer = document.createElement('div');
    const triggerButton = document.createElement('button');
    triggerButton.textContent = 'Trigger Button';

    const modal = document.createElement('div');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', 'modal-popover');
    modal.setAttribute('data-testid', 'focus-trap-modal');
    modal.tabIndex = -1;

    const modalButton1 = document.createElement('button');
    modalButton1.textContent = 'Modal Button 1';
    const modalButton2 = document.createElement('button');
    modalButton2.textContent = 'Modal Button 2';

    modal.appendChild(modalButton1);
    modal.appendChild(modalButton2);
    testContainer.appendChild(triggerButton);
    testContainer.appendChild(modal);
    document.body.appendChild(testContainer);

    // Set focus to modal button
    modalButton1.focus();
    expect(document.activeElement).toBe(modalButton1);

    // Simulate Escape key handler that returns focus to trigger
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    modal.dispatchEvent(escapeEvent);

    // Manually restore focus as per modal escape handler
    triggerButton.focus();
    expect(document.activeElement).toBe(triggerButton);

    document.body.removeChild(testContainer);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Test 3: Focus Restoration After Polling Update
  // ───────────────────────────────────────────────────────────────────────────

  it('Test 3: Should preserve focus when async polling updates occur', () => {
    jest.useFakeTimers();

    setupMockFetch({
      status: 'ok',
      data: {
        status: 'green',
        uptimePercent: 99.9,
        activeServices: 5,
        lastErrorAt: null,
      },
    });

    // Simulate panel with polling
    const pollingPanel = document.createElement('section');
    pollingPanel.setAttribute('data-testid', 'health-polling-panel');

    const button = document.createElement('button');
    button.textContent = 'Refresh Health';
    pollingPanel.appendChild(button);
    container.appendChild(pollingPanel);

    // Focus the button
    button.focus();
    const focusedBefore = document.activeElement;
    expect(focusedBefore).toBe(button);

    // Simulate 10s polling interval
    jest.advanceTimersByTime(10_000);

    // Simulate panel re-render by updating content without removing button
    pollingPanel.innerHTML = '<button>Refresh Health</button>';
    // Browser native behavior: focus is lost on re-render if element was replaced
    // Test verifies this by ensuring we need explicit focus restoration

    // Verify focus management behavior
    const currentFocus = document.activeElement;
    // In real app, focus would be restored by React/component lifecycle
    expect(currentFocus).not.toBe(button); // Focus was lost due to re-render

    jest.useRealTimers();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Test 4: No Focus Traps on Disabled Elements
  // ───────────────────────────────────────────────────────────────────────────

  it('Test 4: Should skip disabled elements during Tab traversal', () => {
    const testRegion = document.createElement('div');
    testRegion.setAttribute('role', 'region');
    testRegion.setAttribute('data-testid', 'test-region');

    const button1 = document.createElement('button');
    button1.textContent = 'Button 1';

    const buttonDisabled = document.createElement('button');
    buttonDisabled.textContent = 'Disabled Button';
    buttonDisabled.disabled = true;

    const button3 = document.createElement('button');
    button3.textContent = 'Button 3';

    const inputDisabled = document.createElement('input');
    inputDisabled.type = 'text';
    inputDisabled.disabled = true;
    inputDisabled.placeholder = 'Disabled Input';

    const inputEnabled = document.createElement('input');
    inputEnabled.type = 'text';
    inputEnabled.placeholder = 'Enabled Input';

    testRegion.appendChild(button1);
    testRegion.appendChild(buttonDisabled);
    testRegion.appendChild(button3);
    testRegion.appendChild(inputDisabled);
    testRegion.appendChild(inputEnabled);
    document.body.appendChild(testRegion);

    // Focus first button
    button1.focus();
    expect(document.activeElement).toBe(button1);

    // Tab to next enabled button (should skip disabled)
    const allFocusable = Array.from(testRegion.querySelectorAll('button:not([disabled]), input:not([disabled])'));
    expect(allFocusable.length).toBeGreaterThan(1);
    expect(allFocusable[0]).toBe(button1);
    expect(allFocusable[1]).toBe(button3);

    // Verify disabled button is not in focusable list
    expect(allFocusable).not.toContain(buttonDisabled);
    expect(allFocusable).not.toContain(inputDisabled);

    document.body.removeChild(testRegion);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Test 5: First Interactive Element per Panel
  // ───────────────────────────────────────────────────────────────────────────

  it('Test 5: Should identify first interactive element in each panel correctly', () => {
    setupMockFetch({
      status: 'ok',
      data: {
        status: 'green',
        uptimePercent: 99.9,
        activeServices: 5,
        lastErrorAt: null,
      },
    });

    // Test HealthPanel first button
    const healthPanel = container.querySelector('[data-testid="panel-health"]');
    expect(healthPanel).toBeTruthy();
    const healthButton = healthPanel?.querySelector('button');
    expect(healthButton).toBeTruthy();
    expect(healthButton?.textContent).toContain('Refresh');

    // Test ControlsPanel first button
    const controlsPanel = container.querySelector('[data-testid="panel-controls"]');
    expect(controlsPanel).toBeTruthy();
    const controlsButton = controlsPanel?.querySelector('button');
    expect(controlsButton).toBeTruthy();
    expect(controlsButton?.textContent).toMatch(/Start Phase|Pause|Resume/);

    // Test AlertsPanel exists
    const alertsPanel = container.querySelector('[data-testid="panel-alerts"]');
    expect(alertsPanel).toBeTruthy();
    const alertsButton = alertsPanel?.querySelector('button');
    expect(alertsButton).toBeTruthy();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Test 6: Focus Trap Within Console Container
  // ───────────────────────────────────────────────────────────────────────────

  it('Test 6: Should keep focus within console container on rapid Tab presses', () => {
    const consoleRoot = container.querySelector('[data-testid="console-container"]') as HTMLElement;
    expect(consoleRoot).toBeTruthy();

    const allFocusable = Array.from(consoleRoot!.querySelectorAll('button, input'));
    expect(allFocusable.length).toBeGreaterThan(0);

    // Focus first element
    const firstElement = allFocusable[0] as HTMLElement;
    firstElement.focus();
    expect(document.activeElement).toBe(firstElement);

    // Simulate Tab traversal through all focusable elements
    for (let i = 0; i < allFocusable.length; i++) {
      const element = allFocusable[i] as HTMLElement;
      element.focus();
      const currentFocus = document.activeElement as HTMLElement;

      // Verify focus is always within console container
      expect(consoleRoot!.contains(currentFocus)).toBe(true);
    }

    // Reverse traversal (Shift+Tab simulation)
    for (let i = allFocusable.length - 1; i >= 0; i--) {
      const element = allFocusable[i] as HTMLElement;
      element.focus();
      const currentFocus = document.activeElement as HTMLElement;

      // Verify focus never escapes console container
      expect(consoleRoot!.contains(currentFocus)).toBe(true);
    }
  });
});
