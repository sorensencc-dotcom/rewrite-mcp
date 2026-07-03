/**
 * Keyboard Shortcuts Module — Phase 3.6 Stream B
 *
 * Provides keyboard-only navigation and control workflows for the Operator Console v3.
 * Enables efficient operator workflows through keyboard bindings for:
 * - Health panel refresh (Ctrl+R)
 * - Pipeline control (P+N for pause/restart)
 * - Alert acknowledgment (A)
 * - Search focus (/)
 * - Panel navigation ([/])
 *
 * All handlers use native fetch for API calls. No external dependencies.
 */

/**
 * API Response type for keyboard-triggered actions
 */
interface KeyboardActionResponse {
  success: boolean;
  message: string;
}

/**
 * Handler function type for keyboard actions
 */
type KeyboardHandler = () => Promise<KeyboardActionResponse> | boolean;

/**
 * Ctrl+R binding — Refresh Health Panel
 *
 * Triggers a POST to /api/console/health to refresh the health dashboard.
 * Returns success status and a descriptive message.
 */
export async function handleRefreshHealth(): Promise<KeyboardActionResponse> {
  try {
    const response = await fetch('/api/console/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return {
        success: false,
        message: `Health refresh failed: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: 'Health dashboard refreshed',
    };
  } catch (error) {
    return {
      success: false,
      message: `Error refreshing health: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * P + {N} binding — Pause/Restart Pipeline
 *
 * Triggers a POST to /api/console/pipeline/{id}/action with the specified action.
 * @param pipelineId - The ID of the pipeline to control
 * @param action - Either 'pause' or 'restart'
 * @returns Promise with success status and descriptive message
 */
export async function handlePipelineAction(
  pipelineId: string,
  action: 'pause' | 'restart'
): Promise<KeyboardActionResponse> {
  if (!pipelineId) {
    return {
      success: false,
      message: 'Pipeline ID is required',
    };
  }

  if (action !== 'pause' && action !== 'restart') {
    return {
      success: false,
      message: `Invalid action: ${action}. Must be 'pause' or 'restart'`,
    };
  }

  try {
    const response = await fetch(`/api/console/pipeline/${pipelineId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });

    if (!response.ok) {
      return {
        success: false,
        message: `Pipeline action failed: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: `Pipeline ${action}ed successfully`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error executing pipeline action: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    };
  }
}

/**
 * A binding — Acknowledge Focused Alert
 *
 * Triggers a POST to /api/console/alerts/{id}/acknowledge to mark an alert as acknowledged.
 * @param alertId - The ID of the alert to acknowledge
 * @returns Promise with success status and descriptive message
 */
export async function handleAcknowledgeAlert(alertId: string): Promise<KeyboardActionResponse> {
  if (!alertId) {
    return {
      success: false,
      message: 'Alert ID is required',
    };
  }

  try {
    const response = await fetch(`/api/console/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return {
        success: false,
        message: `Alert acknowledgment failed: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: 'Alert acknowledged',
    };
  } catch (error) {
    return {
      success: false,
      message: `Error acknowledging alert: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    };
  }
}

/**
 * / binding — Focus Search Input
 *
 * Locates the search input within the console container and focuses it.
 * Searches for input[aria-label="Search"] within the container.
 * @param container - The console container element
 * @returns boolean indicating whether focus was successfully moved
 */
export function handleFocusSearch(container: HTMLElement): boolean {
  const searchInput = container.querySelector('input[aria-label="Search"]') as HTMLInputElement;

  if (!searchInput) {
    return false;
  }

  try {
    searchInput.focus();
    return true;
  } catch {
    return false;
  }
}

/**
 * [ binding — Focus Previous Panel
 *
 * Moves focus to the previous panel's first interactive element.
 * Locates the console container and cycles focus leftward.
 * @param currentPanel - The currently focused panel element
 * @returns boolean indicating whether focus was successfully moved
 */
export function handlePreviousPanel(currentPanel: HTMLElement): boolean {
  const container = currentPanel.closest('[data-testid="console-container"]') as HTMLElement;

  if (!container) {
    return false;
  }

  const allPanels = Array.from(container.querySelectorAll('section')) as HTMLElement[];

  if (allPanels.length <= 1) {
    return false;
  }

  const currentIndex = allPanels.indexOf(currentPanel);

  if (currentIndex === -1) {
    return false;
  }

  const previousIndex = currentIndex === 0 ? allPanels.length - 1 : currentIndex - 1;
  const previousPanel = allPanels[previousIndex];

  const firstInteractive = previousPanel.querySelector(
    'button, input, [role="button"], [role="switch"]'
  ) as HTMLElement;

  if (!firstInteractive) {
    return false;
  }

  try {
    firstInteractive.focus();
    return true;
  } catch {
    return false;
  }
}

/**
 * ] binding — Focus Next Panel
 *
 * Moves focus to the next panel's first interactive element.
 * Locates the console container and cycles focus rightward.
 * @param currentPanel - The currently focused panel element
 * @returns boolean indicating whether focus was successfully moved
 */
export function handleNextPanel(currentPanel: HTMLElement): boolean {
  const container = currentPanel.closest('[data-testid="console-container"]') as HTMLElement;

  if (!container) {
    return false;
  }

  const allPanels = Array.from(container.querySelectorAll('section')) as HTMLElement[];

  if (allPanels.length <= 1) {
    return false;
  }

  const currentIndex = allPanels.indexOf(currentPanel);

  if (currentIndex === -1) {
    return false;
  }

  const nextIndex = currentIndex === allPanels.length - 1 ? 0 : currentIndex + 1;
  const nextPanel = allPanels[nextIndex];

  const firstInteractive = nextPanel.querySelector(
    'button, input, [role="button"], [role="switch"]'
  ) as HTMLElement;

  if (!firstInteractive) {
    return false;
  }

  try {
    firstInteractive.focus();
    return true;
  } catch {
    return false;
  }
}

/**
 * Keyboard Shortcut Registry
 *
 * Maps keyboard key combinations to their handler functions.
 * Supports single keys and key combinations (e.g., 'ctrl+r', 'p', 'a').
 *
 * Note: Handlers that need context (pipelineId, alertId) are not in the registry;
 * they require integration with the ConsoleV3 state to extract the focused element's data attributes.
 */
export const KeyboardShortcutRegistry: Record<string, () => Promise<KeyboardActionResponse>> = {
  'ctrl+r': handleRefreshHealth,
  'a': handleAcknowledgeAlert.bind(null, ''), // Placeholder; real usage requires context
};

/**
 * Register Global Keyboard Listener
 *
 * Attaches a keydown event listener to the console container that dispatches
 * keyboard events to registered handlers. Prevents default for known shortcuts
 * and logs the result of each action.
 *
 * @param consoleContainer - The root console container element
 * @returns A cleanup function that removes the event listener
 */
export function registerGlobalKeyboardListener(
  consoleContainer: HTMLElement
): () => void {
  /**
   * Handler for keydown events on the console container
   */
  async function handleKeyboardEvent(event: KeyboardEvent): Promise<void> {
    const key = event.key.toLowerCase();
    const isCtrlPressed = event.ctrlKey || event.metaKey;
    const isAltPressed = event.altKey;
    const isShiftPressed = event.shiftKey;

    // Construct key combination string
    let keyCombo = '';
    if (isCtrlPressed) keyCombo += 'ctrl+';
    if (isAltPressed) keyCombo += 'alt+';
    if (isShiftPressed) keyCombo += 'shift+';
    keyCombo += key;

    const handler = KeyboardShortcutRegistry[keyCombo];

    // If we have a registered handler, prevent default and call it
    if (handler) {
      event.preventDefault();
      try {
        const result = await handler();
        if (typeof result === 'object' && result !== null) {
          // Log action result if available (use a logging module in production)
          // For now, results are available via return value for testing
        }
      } catch (error) {
        // Log error for debugging (use a logging module in production)
      }
    }

    // Handle panel navigation shortcuts
    if (key === '[' && !isCtrlPressed && !isAltPressed && !isShiftPressed) {
      event.preventDefault();
      const focusedElement = document.activeElement as HTMLElement;
      const closestPanel = focusedElement?.closest('section');
      if (closestPanel) {
        handlePreviousPanel(closestPanel);
      }
    }

    if (key === ']' && !isCtrlPressed && !isAltPressed && !isShiftPressed) {
      event.preventDefault();
      const focusedElement = document.activeElement as HTMLElement;
      const closestPanel = focusedElement?.closest('section');
      if (closestPanel) {
        handleNextPanel(closestPanel);
      }
    }

    // Handle search focus
    if (key === '/' && !isCtrlPressed && !isAltPressed && !isShiftPressed) {
      event.preventDefault();
      handleFocusSearch(consoleContainer);
    }
  }

  // Attach the listener
  consoleContainer.addEventListener('keydown', handleKeyboardEvent as EventListener);

  // Return cleanup function
  return () => {
    consoleContainer.removeEventListener('keydown', handleKeyboardEvent as EventListener);
  };
}
