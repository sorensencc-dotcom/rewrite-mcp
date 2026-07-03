/**
 * Keyboard Shortcuts Tests — Phase 3.6 Stream B
 *
 * Tests all keyboard-triggered workflows for the Operator Console v3.
 * Covers:
 * - Health panel refresh (Ctrl+R)
 * - Pipeline control (P+N)
 * - Alert acknowledgment (A)
 * - Search focus (/)
 * - Panel navigation ([/])
 * - Keyboard registry structure
 *
 * To run: npm test -- keyboard-shortcuts.test.ts
 */

import {
  handleRefreshHealth,
  handlePipelineAction,
  handleAcknowledgeAlert,
  handleFocusSearch,
  handlePreviousPanel,
  handleNextPanel,
  KeyboardShortcutRegistry,
  registerGlobalKeyboardListener,
} from './keyboard-shortcuts';

/**
 * Mock fetch globally for all tests
 */
function setupMockFetch(response: any = { success: true }, statusCode: number = 200): void {
  global.fetch = jest.fn((url: string | Request, options?: RequestInit) => {
    const urlStr = typeof url === 'string' ? url : url.toString();

    return Promise.resolve({
      ok: statusCode >= 200 && statusCode < 300,
      status: statusCode,
      statusText: statusCode === 200 ? 'OK' : 'ERROR',
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
    } as unknown as Response);
  });
}

/**
 * Create a mock console container with panels for navigation tests
 */
function createMockConsoleContainer(): HTMLElement {
  const container = document.createElement('div');
  container.setAttribute('data-testid', 'console-container');
  container.setAttribute('role', 'region');
  container.setAttribute('aria-label', 'operator-console');

  // Create 6 panels in order
  const panelNames = ['health', 'pipelines', 'agents', 'alerts', 'workspace', 'controls'];
  panelNames.forEach((name, index) => {
    const panel = document.createElement('section');
    panel.setAttribute('data-testid', `panel-${name}`);
    panel.setAttribute('data-panel-index', String(index));

    const button = document.createElement('button');
    button.textContent = `${name} button`;
    button.id = `btn-${name}`;

    panel.appendChild(button);
    container.appendChild(panel);
  });

  return container;
}

describe('Keyboard Shortcuts Module (Phase 3.6 Stream B)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockFetch({ success: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Test 1: Ctrl+R — Refresh Health Panel
  // ───────────────────────────────────────────────────────────────────────────

  it('Test 1: handleRefreshHealth should POST to /api/console/health and return success', async () => {
    setupMockFetch({ success: true, timestamp: '2026-06-23T10:00:00Z' }, 200);

    const result = await handleRefreshHealth();

    expect(result.success).toBe(true);
    expect(result.message).toContain('refreshed');
    expect(global.fetch).toHaveBeenCalledWith('/api/console/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('Test 1b: handleRefreshHealth should handle HTTP errors', async () => {
    setupMockFetch({ error: 'Service unavailable' }, 503);

    const result = await handleRefreshHealth();

    expect(result.success).toBe(false);
    expect(result.message).toContain('failed');
  });

  it('Test 1c: handleRefreshHealth should handle network errors', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

    const result = await handleRefreshHealth();

    expect(result.success).toBe(false);
    expect(result.message).toContain('Error');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Test 2: P+N — Pause Pipeline
  // ───────────────────────────────────────────────────────────────────────────

  it('Test 2: handlePipelineAction should POST with action=pause for pause action', async () => {
    setupMockFetch({ success: true }, 200);

    const result = await handlePipelineAction('pipeline-123', 'pause');

    expect(result.success).toBe(true);
    expect(result.message).toContain('pause');
    expect(global.fetch).toHaveBeenCalledWith('/api/console/pipeline/pipeline-123/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pause' }),
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Test 3: P+N — Restart Pipeline
  // ───────────────────────────────────────────────────────────────────────────

  it('Test 3: handlePipelineAction should POST with action=restart for restart action', async () => {
    setupMockFetch({ success: true }, 200);

    const result = await handlePipelineAction('pipeline-456', 'restart');

    expect(result.success).toBe(true);
    expect(result.message).toContain('restart');
    expect(global.fetch).toHaveBeenCalledWith('/api/console/pipeline/pipeline-456/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restart' }),
    });
  });

  it('Test 3b: handlePipelineAction should reject invalid actions', async () => {
    const result = await handlePipelineAction('pipeline-123', 'invalid' as any);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid action');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('Test 3c: handlePipelineAction should reject empty pipeline ID', async () => {
    const result = await handlePipelineAction('', 'pause');

    expect(result.success).toBe(false);
    expect(result.message).toContain('Pipeline ID is required');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Test 4: A — Acknowledge Alert
  // ───────────────────────────────────────────────────────────────────────────

  it('Test 4: handleAcknowledgeAlert should POST to /api/console/alerts/{id}/acknowledge', async () => {
    setupMockFetch({ success: true }, 200);

    const result = await handleAcknowledgeAlert('alert-789');

    expect(result.success).toBe(true);
    expect(result.message).toContain('acknowledged');
    expect(global.fetch).toHaveBeenCalledWith('/api/console/alerts/alert-789/acknowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('Test 4b: handleAcknowledgeAlert should handle HTTP errors', async () => {
    setupMockFetch({ error: 'Alert not found' }, 404);

    const result = await handleAcknowledgeAlert('alert-invalid');

    expect(result.success).toBe(false);
    expect(result.message).toContain('failed');
  });

  it('Test 4c: handleAcknowledgeAlert should reject empty alert ID', async () => {
    const result = await handleAcknowledgeAlert('');

    expect(result.success).toBe(false);
    expect(result.message).toContain('Alert ID is required');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Test 5: / — Focus Search Input
  // ───────────────────────────────────────────────────────────────────────────

  it('Test 5: handleFocusSearch should focus search input via aria-label', () => {
    const container = document.createElement('div');
    const searchInput = document.createElement('input');
    searchInput.setAttribute('aria-label', 'Search');
    searchInput.type = 'text';

    container.appendChild(searchInput);
    document.body.appendChild(container);

    const focusSpy = jest.spyOn(searchInput, 'focus');
    const result = handleFocusSearch(container);

    expect(result).toBe(true);
    expect(focusSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(searchInput);

    document.body.removeChild(container);
  });

  it('Test 5b: handleFocusSearch should return false if search input not found', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const result = handleFocusSearch(container);

    expect(result).toBe(false);

    document.body.removeChild(container);
  });

  it('Test 5c: handleFocusSearch should handle focus errors gracefully', () => {
    const container = document.createElement('div');
    const searchInput = document.createElement('input');
    searchInput.setAttribute('aria-label', 'Search');

    container.appendChild(searchInput);
    document.body.appendChild(container);

    jest.spyOn(searchInput, 'focus').mockImplementation(() => {
      throw new Error('Focus failed');
    });

    const result = handleFocusSearch(container);

    expect(result).toBe(false);

    document.body.removeChild(container);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Test 6: [ — Previous Panel
  // ───────────────────────────────────────────────────────────────────────────

  it('Test 6: handlePreviousPanel should move focus to previous panel first interactive element', () => {
    const container = createMockConsoleContainer();
    document.body.appendChild(container);

    // Get the second panel (pipelines)
    const pipelines = container.querySelector('[data-testid="panel-pipelines"]') as HTMLElement;
    const pipelineButton = pipelines.querySelector('button') as HTMLElement;
    pipelineButton.focus();

    // Move to previous panel (health)
    const result = handlePreviousPanel(pipelines);

    expect(result).toBe(true);
    const healthButton = container.querySelector('[data-testid="panel-health"] button') as HTMLElement;
    expect(document.activeElement).toBe(healthButton);

    document.body.removeChild(container);
  });

  it('Test 6b: handlePreviousPanel should wrap to last panel when at first panel', () => {
    const container = createMockConsoleContainer();
    document.body.appendChild(container);

    // Start at first panel (health)
    const health = container.querySelector('[data-testid="panel-health"]') as HTMLElement;
    const healthButton = health.querySelector('button') as HTMLElement;
    healthButton.focus();

    // Move to previous panel (should wrap to controls)
    const result = handlePreviousPanel(health);

    expect(result).toBe(true);
    const controlsButton = container.querySelector('[data-testid="panel-controls"] button') as HTMLElement;
    expect(document.activeElement).toBe(controlsButton);

    document.body.removeChild(container);
  });

  it('Test 6c: handlePreviousPanel should return false if no console container found', () => {
    const orphanPanel = document.createElement('section');
    document.body.appendChild(orphanPanel);

    const result = handlePreviousPanel(orphanPanel);

    expect(result).toBe(false);

    document.body.removeChild(orphanPanel);
  });

  it('Test 6d: handlePreviousPanel should return false if only one panel exists', () => {
    const container = document.createElement('div');
    container.setAttribute('data-testid', 'console-container');

    const panel = document.createElement('section');
    const button = document.createElement('button');
    button.textContent = 'Solo Panel Button';
    panel.appendChild(button);
    container.appendChild(panel);
    document.body.appendChild(container);

    const result = handlePreviousPanel(panel);

    expect(result).toBe(false);

    document.body.removeChild(container);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Test 7: ] — Next Panel
  // ───────────────────────────────────────────────────────────────────────────

  it('Test 7: handleNextPanel should move focus to next panel first interactive element', () => {
    const container = createMockConsoleContainer();
    document.body.appendChild(container);

    // Get the first panel (health)
    const health = container.querySelector('[data-testid="panel-health"]') as HTMLElement;
    const healthButton = health.querySelector('button') as HTMLElement;
    healthButton.focus();

    // Move to next panel (pipelines)
    const result = handleNextPanel(health);

    expect(result).toBe(true);
    const pipelineButton = container.querySelector('[data-testid="panel-pipelines"] button') as HTMLElement;
    expect(document.activeElement).toBe(pipelineButton);

    document.body.removeChild(container);
  });

  it('Test 7b: handleNextPanel should wrap to first panel when at last panel', () => {
    const container = createMockConsoleContainer();
    document.body.appendChild(container);

    // Start at last panel (controls)
    const controls = container.querySelector('[data-testid="panel-controls"]') as HTMLElement;
    const controlsButton = controls.querySelector('button') as HTMLElement;
    controlsButton.focus();

    // Move to next panel (should wrap to health)
    const result = handleNextPanel(controls);

    expect(result).toBe(true);
    const healthButton = container.querySelector('[data-testid="panel-health"] button') as HTMLElement;
    expect(document.activeElement).toBe(healthButton);

    document.body.removeChild(container);
  });

  it('Test 7c: handleNextPanel should return false if no console container found', () => {
    const orphanPanel = document.createElement('section');
    document.body.appendChild(orphanPanel);

    const result = handleNextPanel(orphanPanel);

    expect(result).toBe(false);

    document.body.removeChild(orphanPanel);
  });

  it('Test 7d: handleNextPanel should return false if only one panel exists', () => {
    const container = document.createElement('div');
    container.setAttribute('data-testid', 'console-container');

    const panel = document.createElement('section');
    const button = document.createElement('button');
    button.textContent = 'Solo Panel Button';
    panel.appendChild(button);
    container.appendChild(panel);
    document.body.appendChild(container);

    const result = handleNextPanel(panel);

    expect(result).toBe(false);

    document.body.removeChild(container);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Test 8: Keyboard Shortcut Registry
  // ───────────────────────────────────────────────────────────────────────────

  it('Test 8: KeyboardShortcutRegistry should contain all required bindings', () => {
    // Verify registry structure
    expect(KeyboardShortcutRegistry).toBeDefined();
    expect(typeof KeyboardShortcutRegistry).toBe('object');

    // Check for required bindings
    expect(KeyboardShortcutRegistry['ctrl+r']).toBeDefined();
    expect(typeof KeyboardShortcutRegistry['ctrl+r']).toBe('function');

    expect(KeyboardShortcutRegistry['a']).toBeDefined();
    expect(typeof KeyboardShortcutRegistry['a']).toBe('function');
  });

  it('Test 8b: KeyboardShortcutRegistry handlers should be callable', async () => {
    setupMockFetch({ success: true }, 200);

    // Test Ctrl+R handler
    const result = await KeyboardShortcutRegistry['ctrl+r']();
    expect(typeof result).toBe('object');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Test 9: registerGlobalKeyboardListener
  // ───────────────────────────────────────────────────────────────────────────

  it('Test 9: registerGlobalKeyboardListener should attach and remove event listener', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const addListenerSpy = jest.spyOn(container, 'addEventListener');
    const removeListenerSpy = jest.spyOn(container, 'removeEventListener');

    const cleanup = registerGlobalKeyboardListener(container);

    expect(addListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    cleanup();

    expect(removeListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    document.body.removeChild(container);
  });

  it('Test 9b: registerGlobalKeyboardListener should handle Ctrl+R keydown event', async () => {
    setupMockFetch({ success: true }, 200);

    const container = createMockConsoleContainer();
    document.body.appendChild(container);

    const cleanup = registerGlobalKeyboardListener(container);

    const event = new KeyboardEvent('keydown', {
      key: 'r',
      ctrlKey: true,
      bubbles: true,
    });

    jest.spyOn(event, 'preventDefault');
    container.dispatchEvent(event);

    expect(event.preventDefault).toHaveBeenCalled();

    cleanup();
    document.body.removeChild(container);
  });

  it('Test 9c: registerGlobalKeyboardListener should handle [ keydown for previous panel', () => {
    const container = createMockConsoleContainer();
    document.body.appendChild(container);

    const cleanup = registerGlobalKeyboardListener(container);

    // Focus a button in pipelines panel
    const pipelineButton = container.querySelector('[data-testid="panel-pipelines"] button') as HTMLElement;
    pipelineButton.focus();

    const event = new KeyboardEvent('keydown', {
      key: '[',
      bubbles: true,
    });

    jest.spyOn(event, 'preventDefault');
    container.dispatchEvent(event);

    expect(event.preventDefault).toHaveBeenCalled();

    cleanup();
    document.body.removeChild(container);
  });

  it('Test 9d: registerGlobalKeyboardListener should handle ] keydown for next panel', () => {
    const container = createMockConsoleContainer();
    document.body.appendChild(container);

    const cleanup = registerGlobalKeyboardListener(container);

    // Focus a button in health panel
    const healthButton = container.querySelector('[data-testid="panel-health"] button') as HTMLElement;
    healthButton.focus();

    const event = new KeyboardEvent('keydown', {
      key: ']',
      bubbles: true,
    });

    jest.spyOn(event, 'preventDefault');
    container.dispatchEvent(event);

    expect(event.preventDefault).toHaveBeenCalled();

    cleanup();
    document.body.removeChild(container);
  });

  it('Test 9e: registerGlobalKeyboardListener should handle / keydown for search focus', () => {
    const container = createMockConsoleContainer();
    const searchInput = document.createElement('input');
    searchInput.setAttribute('aria-label', 'Search');
    container.appendChild(searchInput);
    document.body.appendChild(container);

    const cleanup = registerGlobalKeyboardListener(container);

    const event = new KeyboardEvent('keydown', {
      key: '/',
      bubbles: true,
    });

    jest.spyOn(event, 'preventDefault');
    container.dispatchEvent(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(searchInput);

    cleanup();
    document.body.removeChild(container);
  });
});
