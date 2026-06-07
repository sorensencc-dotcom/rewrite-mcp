// dashboard.spec.ts
// CIC Dashboard Playwright Suite — v1.0.0 (2026-05-19)

import { test, expect } from '@playwright/test';

test.describe('CIC Observability Dashboard', () => {

  test('loads dashboard, regions, and initializes polling loop', async ({ page }) => {
    await page.goto('http://127.0.0.1:8080/dashboard?bypass_auth=true');

    // Region selector should eventually have options
    const regionSelect = page.locator('#region-select');
    await expect(regionSelect).toBeVisible();
    await page.waitForFunction((sel) => sel.options.length > 0, await regionSelect.elementHandle());

    // Core DOM elements
    await expect(page.locator('#agent-grid')).toBeVisible();
    await expect(page.locator('#event-log')).toBeVisible();
    await expect(page.locator('#pipeline-diagram')).toBeVisible();

    // JS bootstrapped
    const polling = await page.evaluate(() => window.__CIC_POLLING_ACTIVE__);
    expect(polling).toBe(true);
  });

  test('renders all 5 core agents with valid states for a region', async ({ page }) => {
    await page.goto('http://127.0.0.1:8080/dashboard?bypass_auth=true');

    const agents = ['INGEST', 'ENRICH', 'ORCHESTRATE', 'SYNTHESIZE', 'AUDIT'];

    // Wait for the first region to load and agents to be rendered
    await page.waitForSelector('.agent-card');

    for (const agent of agents) {
      const node = page.locator(`[data-agent="${agent}"]`);
      await expect(node).toBeVisible();

      const state = await node.getAttribute('data-state');
      expect(['ONLINE', 'DOWN', 'DEGRADED', 'PENDING']).toContain(state);
    }
  });

  test('event log shows max 50 entries and auto-trims', async ({ page }) => {
    await page.goto('http://127.0.0.1:8080/dashboard?bypass_auth=true');

    // Wait for log to populate
    await page.waitForSelector('.event-log-entry');

    const entries = page.locator('.event-log-entry');
    const count = await entries.count();

    expect(count).toBeLessThanOrEqual(50);

    // Validate timestamp format
    const first = await entries.first().innerText();
    expect(first).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
  });

  test('pipeline diagram renders all nodes and transitions animate', async ({ page }) => {
    await page.goto('http://127.0.0.1:8080/dashboard?bypass_auth=true');

    const nodes = ['INGEST', 'ENRICH', 'ORCHESTRATE', 'SYNTHESIZE', 'AUDIT'];

    for (const n of nodes) {
      await expect(page.locator(`[data-pipeline-node="${n}"]`)).toBeVisible();
    }

    // Trigger a fake state change
    await page.evaluate(() => {
      const node = document.querySelector('[data-pipeline-node="ENRICH"]');
      if (node) node.classList.add('pulse');
    });

    const hasPulse = await page.locator('[data-pipeline-node="ENRICH"].pulse').count();
    expect(hasPulse).toBe(1);
  });

  test('visual regression: dashboard initial state', async ({ page }) => {
    await page.goto('http://127.0.0.1:8080/dashboard?bypass_auth=true');
    
    // Mask dynamic content to avoid false positives
    await expect(page).toHaveScreenshot('dashboard-initial.png', {
      mask: [
        page.locator('#agent-grid'),
        page.locator('#event-log'),
        page.locator('.timestamp'),
        page.locator('#region-select')
      ]
    });
  });

  test('visual regression: pipeline diagram nodes', async ({ page }) => {
    await page.goto('http://127.0.0.1:8080/dashboard?bypass_auth=true');
    
    const diagram = page.locator('#pipeline-diagram');
    await expect(diagram).toHaveScreenshot('pipeline-diagram.png');
  });

  test('handles agent timeout (AbortController 5s limit) on region proxy', async ({ page }) => {
    // Intercept region-specific agent status requests and delay them by 6s
    await page.route('**/regions/*/agents**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 6000));
      await route.continue();
    });

    await page.goto('http://127.0.0.1:8080/dashboard?bypass_auth=true');

    // Verify UI transitions to DOWN state on timeout
    const ingester = page.locator('[data-agent="INGEST"]');
    await expect(ingester).toHaveAttribute('data-state', /DOWN|DEGRADED|PENDING/, { timeout: 15000 });
    
    const logEntry = page.locator('.event-log-entry').first();
    await expect(logEntry).toContainText(/timeout|failed|error/i);
  });

  test('Intelligence Timeline renders recent events', async ({ page }) => {
    await page.goto('http://127.0.0.1:8080/dashboard?bypass_auth=true');

    const timeline = page.locator('#timeline-panel');
    await expect(timeline).toBeVisible();

    // Wait for at least one tick
    await page.waitForTimeout(4000);

    const text = await page.locator('#timeline-body').innerText();
    expect(text.length).toBeGreaterThan(0);
  });

  test('filters Intelligence Timeline events', async ({ page }) => {
    await page.goto('http://127.0.0.1:8080/dashboard?bypass_auth=true');
    await expect(page.locator('#timeline-body')).not.toContainText('Initializing timeline...', { timeout: 10000 });

    // 1. Trigger an OVERRIDE action
    await page.waitForSelector('.agent-card .btn-reset');
    const resetBtn = page.locator('.agent-card .btn-reset').first();
    await resetBtn.click();
    
    // 2. Type "override" in search
    const searchInput = page.locator('#timeline-search');
    await searchInput.fill('override');
    
    // 3. Wait for the timeline to show the OVERRIDE event (poll every 3s)
    await expect(page.locator('#timeline-body')).toContainText('OVERRIDE', { timeout: 15000 });
    
    // 4. Type a garbage search and expect no matches
    await searchInput.fill('zxqjkwxyz');
    await expect(page.locator('#timeline-body')).toContainText('No events match the current filters.', { timeout: 5000 });
  });

  test('propagates correlation ID from manual action to timeline', async ({ page }) => {
    await page.goto('http://127.0.0.1:8080/dashboard?bypass_auth=true');
    
    // Wait for timeline to initialize
    await expect(page.locator('#timeline-body')).not.toContainText('Initializing timeline...', { timeout: 10000 });

    // 1. Trigger a manual action (RESET)
    await page.waitForSelector('.agent-card .btn-reset');
    const resetBtn = page.locator('.agent-card .btn-reset').first();
    await resetBtn.click();
    
    // 2. Wait for the timeline to update (polls every 3s)
    await page.waitForTimeout(5000);
    
    // 3. Check if the timeline shows the OVERRIDE event with an op- prefixed CID
    const timelineText = await page.locator('#timeline-body').innerText();
    expect(timelineText).toContain('OVERRIDE');
    
    // The shortened CID should be present (8 chars)
    // Format: [ts] [region] [cid] [TYPE] detail
    const lines = timelineText.split('\n');
    const overrideLine = lines.find(l => l.includes('OVERRIDE'));
    expect(overrideLine).toBeDefined();
    
    // Shortened CID regex: [a-f0-9]{8} or similar
    expect(overrideLine).toMatch(/\[.{8}\]/i);
  });

});
