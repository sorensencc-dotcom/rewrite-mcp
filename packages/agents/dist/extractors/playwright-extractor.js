export class PlaywrightNotConfiguredError extends Error {
    constructor(message) {
        super(message);
        this.name = 'PlaywrightNotConfiguredError';
        Object.setPrototypeOf(this, PlaywrightNotConfiguredError.prototype);
    }
}
const CSS_PROPS = [
    'color', 'background-color', 'border-color',
    'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
    'display', 'position', 'flex-direction', 'grid-template-columns',
    'margin', 'padding', 'gap',
    'width', 'height', 'max-width',
    'border-radius', 'box-shadow', 'opacity',
    'z-index', 'overflow', 'text-align', 'text-decoration',
];
export class PlaywrightExtractor {
    constructor(options = {}) {
        this.options = {
            headless: true,
            timeout: 30000,
            viewport: { width: 1920, height: 1080 },
            userAgent: 'RewriteLabsBot/1.0',
            waitForNavigation: true,
            screenshotOnError: false,
            ...options,
        };
    }
    async extract(url) {
        const executablePath = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'];
        if (!executablePath) {
            throw new PlaywrightNotConfiguredError('PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH not set — set to chromium binary path (e.g. /usr/bin/chromium-browser)');
        }
        const { chromium } = await import('playwright-core');
        let browser = null;
        try {
            browser = await chromium.launch({
                executablePath,
                headless: this.options.headless,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            });
            const startTime = Date.now();
            const context = await browser.newContext({
                viewport: this.options.viewport,
                userAgent: this.options.userAgent,
            });
            const page = await context.newPage();
            await page.goto(url, {
                timeout: this.options.timeout,
                waitUntil: this.options.waitForNavigation ? 'networkidle' : 'load',
            });
            const title = await page.title();
            const viewport = page.viewportSize() ?? this.options.viewport;
            const [computedStyles, interactiveElements, screenshots, performanceMetrics] = await Promise.all([
                this.extractComputedStyles(page),
                this.extractInteractiveElements(page),
                this.takeScreenshots(page),
                this.extractPerformanceMetrics(page),
            ]);
            return {
                url,
                title,
                viewport,
                computedStyles,
                interactiveElements,
                screenshots,
                performanceMetrics,
                jsExecutionTime: Date.now() - startTime,
                extractedAt: new Date().toISOString(),
            };
        }
        catch (err) {
            if (err instanceof PlaywrightNotConfiguredError)
                throw err;
            if (this.options.screenshotOnError && browser) {
                // TODO: capture error screenshot before close
            }
            return null;
        }
        finally {
            await browser?.close();
        }
    }
    async extractComputedStyles(page) {
        return page.evaluate((props) => {
            function getSelector(el) {
                if (el.id)
                    return `#${el.id}`;
                const cls = el.className;
                if (cls && typeof cls === 'string' && cls.trim()) {
                    return `${el.tagName.toLowerCase()}.${cls.trim().split(/\s+/)[0]}`;
                }
                return el.tagName.toLowerCase();
            }
            return Array.from(document.querySelectorAll('*'))
                .slice(0, 300)
                .map((el) => {
                const computed = window.getComputedStyle(el);
                const box = el.getBoundingClientRect();
                const styles = {};
                for (const prop of props) {
                    const val = computed.getPropertyValue(prop);
                    if (val)
                        styles[prop] = val;
                }
                return {
                    selector: getSelector(el),
                    computed: styles,
                    box: { width: box.width, height: box.height, top: box.top, left: box.left },
                };
            });
        }, [...CSS_PROPS]);
    }
    async extractInteractiveElements(page) {
        return page.evaluate(() => {
            function getSelector(el) {
                if (el.id)
                    return `#${el.id}`;
                const cls = el.className;
                if (cls && typeof cls === 'string' && cls.trim()) {
                    return `${el.tagName.toLowerCase()}.${cls.trim().split(/\s+/)[0]}`;
                }
                return el.tagName.toLowerCase();
            }
            const SELECTORS = 'button, input, select, textarea, a[href], [role="button"], [onclick]';
            return Array.from(document.querySelectorAll(SELECTORS))
                .slice(0, 100)
                .map((el) => {
                const htmlEl = el;
                const style = window.getComputedStyle(el);
                return {
                    tag: el.tagName.toLowerCase(),
                    type: htmlEl.type || undefined,
                    selector: getSelector(el),
                    text: el.textContent?.trim().slice(0, 100) || undefined,
                    ariaLabel: el.getAttribute('aria-label') || undefined,
                    isVisible: style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        style.opacity !== '0',
                    isDisabled: htmlEl.disabled ?? false,
                };
            });
        });
    }
    async takeScreenshots(page) {
        const viewport = page.viewportSize() ?? this.options.viewport;
        const buf = await page.screenshot({ fullPage: false });
        return [
            {
                width: viewport.width,
                height: viewport.height,
                dataUrl: `data:image/png;base64,${buf.toString('base64')}`,
                capturedAt: new Date().toISOString(),
            },
        ];
    }
    async extractPerformanceMetrics(page) {
        try {
            return await page.evaluate(() => {
                const nav = performance.getEntriesByType('navigation')[0];
                const fcp = performance.getEntriesByName('first-contentful-paint')[0];
                return {
                    navigationStart: nav?.startTime ?? 0,
                    loadEventEnd: nav?.loadEventEnd ?? 0,
                    domContentLoadedEventEnd: nav?.domContentLoadedEventEnd ?? 0,
                    firstContentfulPaint: fcp?.startTime ?? 0,
                };
            });
        }
        catch {
            return undefined;
        }
    }
}
