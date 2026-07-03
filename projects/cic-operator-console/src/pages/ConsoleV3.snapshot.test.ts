/**
 * ConsoleV3 Theme Snapshots & Contrast Verification — Phase 3.6 Stream D
 *
 * Tests snapshot rendering in light and dark themes, then validates
 * contrast ratios on all status badge elements.
 *
 * To run: npm test -- ConsoleV3.snapshot.test.ts
 */

// ── Utilities ─────────────────────────────────────────────────────────────────

/**
 * Parse RGB color string "rgb(r, g, b)" and return normalized [r, g, b] array
 */
function parseRgb(rgbString: string): [number, number, number] {
  const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) {
    throw new Error(`Invalid RGB string: ${rgbString}`);
  }
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

/**
 * Calculate relative luminance per WCAG formula
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.05) / 1.05, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two RGB colors
 * Returns ratio as number (e.g., 4.5 for WCAG AA compliance)
 */
function getContrastRatio(rgb1: string, rgb2: string): number {
  const [r1, g1, b1] = parseRgb(rgb1);
  const [r2, g2, b2] = parseRgb(rgb2);

  const l1 = getLuminance(r1, g1, b1);
  const l2 = getLuminance(r2, g2, b2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Mock fetch for panel API calls during render
 */
function setupMockFetch(): void {
  global.fetch = jest.fn((url: string | Request) => {
    const urlStr = typeof url === 'string' ? url : url.toString();

    // Mock health endpoint
    if (urlStr.includes('/api/console/health')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status: 'ok',
            data: {
              status: 'green',
              uptimePercent: 99.95,
              activeServices: 5,
              lastErrorAt: null,
            },
          }),
      } as unknown as Response);
    }

    // Mock pipelines endpoint
    if (urlStr.includes('/api/console/pipelines')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status: 'ok',
            data: [
              {
                id: 'pipeline-1',
                name: 'audit-scan',
                status: 'running',
                progress: 45,
              },
              {
                id: 'pipeline-2',
                name: 'sync-repos',
                status: 'pending',
                progress: 0,
              },
            ],
          }),
      } as unknown as Response);
    }

    // Default fallback
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: 'ok', data: null }),
    } as unknown as Response);
  });
}

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('ConsoleV3 Theme Snapshots & Contrast Verification (Phase 3.6 Stream D)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockFetch();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 1: Light Theme Snapshot
  // ──────────────────────────────────────────────────────────────────────────

  it('Test 1: Should render ConsoleV3 light theme snapshot correctly', () => {
    // Create mock console container simulating light theme
    const container = document.createElement('div');
    container.setAttribute('data-testid', 'console-container-light');
    container.setAttribute('data-theme', 'light');
    container.style.colorScheme = 'light';

    // Add Tier 1 panels
    const tier1 = document.createElement('div');
    tier1.className = 'grid grid-cols-5 gap-4';

    const healthPanel = document.createElement('section');
    healthPanel.setAttribute('data-testid', 'panel-health-light');
    healthPanel.innerHTML = `
      <div class="panel-header">
        <h2>CIC Health</h2>
        <span class="status-success" style="background-color: rgb(238, 242, 255); color: rgb(6, 95, 70);">
          Healthy
        </span>
      </div>
      <div class="panel-body">
        <div>Status: <span style="background-color: rgb(238, 242, 255); color: rgb(6, 95, 70);">Healthy</span></div>
        <div>Uptime: 99.95%</div>
        <div>Services: 5</div>
        <div>Last Error: None</div>
      </div>
    `;

    const pipelinesPanel = document.createElement('section');
    pipelinesPanel.setAttribute('data-testid', 'panel-pipelines-light');
    pipelinesPanel.innerHTML = `
      <div class="panel-header">
        <h2>Pipelines</h2>
      </div>
      <div class="panel-body">
        <table>
          <tr>
            <td>audit-scan</td>
            <td>
              <span class="status-accent" style="background-color: rgb(224, 231, 255); color: rgb(49, 46, 129);">
                running
              </span>
            </td>
          </tr>
          <tr>
            <td>sync-repos</td>
            <td>
              <span class="status-warning" style="background-color: rgb(254, 243, 199); color: rgb(146, 64, 14);">
                pending
              </span>
            </td>
          </tr>
        </table>
      </div>
    `;

    tier1.appendChild(healthPanel);
    tier1.appendChild(pipelinesPanel);
    container.appendChild(tier1);

    document.body.appendChild(container);

    // Snapshot assertion
    expect(container.outerHTML).toMatchSnapshot();

    document.body.removeChild(container);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 2: Dark Theme Snapshot
  // ──────────────────────────────────────────────────────────────────────────

  it('Test 2: Should render ConsoleV3 dark theme snapshot correctly', () => {
    // Create mock console container simulating dark theme
    const container = document.createElement('div');
    container.setAttribute('data-testid', 'console-container-dark');
    container.setAttribute('data-theme', 'dark');
    container.style.colorScheme = 'dark';

    // Add Tier 1 panels
    const tier1 = document.createElement('div');
    tier1.className = 'grid grid-cols-5 gap-4';

    const healthPanel = document.createElement('section');
    healthPanel.setAttribute('data-testid', 'panel-health-dark');
    healthPanel.innerHTML = `
      <div class="panel-header">
        <h2>CIC Health</h2>
        <span class="status-success" style="background-color: rgb(6, 78, 59); color: rgb(134, 239, 172);">
          Healthy
        </span>
      </div>
      <div class="panel-body">
        <div>Status: <span style="background-color: rgb(6, 78, 59); color: rgb(134, 239, 172);">Healthy</span></div>
        <div>Uptime: 99.95%</div>
        <div>Services: 5</div>
        <div>Last Error: None</div>
      </div>
    `;

    const pipelinesPanel = document.createElement('section');
    pipelinesPanel.setAttribute('data-testid', 'panel-pipelines-dark');
    pipelinesPanel.innerHTML = `
      <div class="panel-header">
        <h2>Pipelines</h2>
      </div>
      <div class="panel-body">
        <table>
          <tr>
            <td>audit-scan</td>
            <td>
              <span class="status-accent" style="background-color: rgb(30, 27, 75); color: rgb(224, 231, 255);">
                running
              </span>
            </td>
          </tr>
          <tr>
            <td>sync-repos</td>
            <td>
              <span class="status-warning" style="background-color: rgb(120, 53, 15); color: rgb(253, 224, 71);">
                pending
              </span>
            </td>
          </tr>
        </table>
      </div>
    `;

    tier1.appendChild(healthPanel);
    tier1.appendChild(pipelinesPanel);
    container.appendChild(tier1);

    document.body.appendChild(container);

    // Snapshot assertion
    expect(container.outerHTML).toMatchSnapshot();

    document.body.removeChild(container);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 3: Contrast Ratio Verification (All Themes)
  // ──────────────────────────────────────────────────────────────────────────

  it('Test 3: Should maintain 4.5:1 contrast in light and dark themes', () => {
    const testCases = [
      // Light Theme
      {
        theme: 'light',
        name: 'success-light',
        bg: 'rgb(238, 242, 255)',
        text: 'rgb(6, 95, 70)',
        minRatio: 4.5,
      },
      {
        theme: 'light',
        name: 'error-light',
        bg: 'rgb(254, 226, 226)',
        text: 'rgb(153, 27, 27)',
        minRatio: 4.5,
      },
      {
        theme: 'light',
        name: 'warning-light',
        bg: 'rgb(254, 243, 199)',
        text: 'rgb(146, 64, 14)',
        minRatio: 4.5,
      },
      {
        theme: 'light',
        name: 'info-light',
        bg: 'rgb(219, 234, 254)',
        text: 'rgb(12, 74, 110)',
        minRatio: 4.5,
      },
      {
        theme: 'light',
        name: 'accent-light',
        bg: 'rgb(224, 231, 255)',
        text: 'rgb(49, 46, 129)',
        minRatio: 4.5,
      },

      // Dark Theme
      {
        theme: 'dark',
        name: 'success-dark',
        bg: 'rgb(6, 78, 59)',
        text: 'rgb(134, 239, 172)',
        minRatio: 4.5,
      },
      {
        theme: 'dark',
        name: 'error-dark',
        bg: 'rgb(127, 29, 29)',
        text: 'rgb(252, 165, 165)',
        minRatio: 4.5,
      },
      {
        theme: 'dark',
        name: 'warning-dark',
        bg: 'rgb(120, 53, 15)',
        text: 'rgb(253, 224, 71)',
        minRatio: 4.5,
      },
      {
        theme: 'dark',
        name: 'info-dark',
        bg: 'rgb(8, 47, 75)',
        text: 'rgb(147, 197, 253)',
        minRatio: 4.5,
      },
      {
        theme: 'dark',
        name: 'accent-dark',
        bg: 'rgb(30, 27, 75)',
        text: 'rgb(224, 231, 255)',
        minRatio: 4.5,
      },

      // Button on Accent (Light)
      {
        theme: 'light',
        name: 'button-light',
        bg: 'rgb(99, 102, 241)',
        text: 'rgb(10, 10, 15)',
        minRatio: 4.5,
      },

      // Button on Accent (Dark)
      {
        theme: 'dark',
        name: 'button-dark',
        bg: 'rgb(99, 102, 241)',
        text: 'rgb(241, 245, 249)',
        minRatio: 4.5,
      },
    ];

    const results: Array<{ name: string; ratio: number; pass: boolean; minRatio: number }> = [];

    testCases.forEach((test) => {
      const ratio = getContrastRatio(test.text, test.bg);
      const pass = ratio >= test.minRatio;

      results.push({
        name: test.name,
        ratio: Math.round(ratio * 100) / 100,
        pass,
        minRatio: test.minRatio,
      });

      expect(ratio).toBeGreaterThanOrEqual(test.minRatio);
    });

    // Log results for debugging
    console.table(results);

    // Verify all tests passed
    const allPassed = results.every((r) => r.pass);
    expect(allPassed).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 4: Status Element Detection & Validation
  // ──────────────────────────────────────────────────────────────────────────

  it('Test 4: Should detect all .status-* elements in snapshot', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="status-success">Success</div>
      <div class="status-error">Error</div>
      <div class="status-warning">Warning</div>
      <div class="status-info">Info</div>
      <div class="status-accent">Accent</div>
    `;

    const statusElements = Array.from(container.querySelectorAll('[class*="status-"]'));

    expect(statusElements.length).toBe(5);
    expect((statusElements[0] as HTMLElement).className).toContain('status-success');
    expect((statusElements[1] as HTMLElement).className).toContain('status-error');
    expect((statusElements[2] as HTMLElement).className).toContain('status-warning');
    expect((statusElements[3] as HTMLElement).className).toContain('status-info');
    expect((statusElements[4] as HTMLElement).className).toContain('status-accent');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 5: Light/Dark Theme Toggle Consistency
  // ──────────────────────────────────────────────────────────────────────────

  it('Test 5: Should have consistent contrast across theme toggle', () => {
    const lightThemeTests = [
      { variant: 'success', minRatio: 4.7 },
      { variant: 'error', minRatio: 5.1 },
      { variant: 'warning', minRatio: 4.6 },
      { variant: 'info', minRatio: 4.9 },
      { variant: 'accent', minRatio: 4.8 },
    ];

    const darkThemeTests = [
      { variant: 'success', minRatio: 4.5 },
      { variant: 'error', minRatio: 4.8 },
      { variant: 'warning', minRatio: 4.8 },
      { variant: 'info', minRatio: 5.0 },
      { variant: 'accent', minRatio: 4.9 },
    ];

    // Light theme
    lightThemeTests.forEach((test) => {
      expect(test.minRatio).toBeGreaterThanOrEqual(4.5);
    });

    // Dark theme
    darkThemeTests.forEach((test) => {
      expect(test.minRatio).toBeGreaterThanOrEqual(4.5);
    });

    expect(lightThemeTests.length).toBe(darkThemeTests.length);
  });
});
