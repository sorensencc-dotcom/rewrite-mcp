"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// playwright.config.ts
const test_1 = require("@playwright/test");
exports.default = (0, test_1.defineConfig)({
    testDir: './tests/playwright',
    timeout: 15000,
    use: {
        headless: true,
        viewport: { width: 1600, height: 900 },
        ignoreHTTPSErrors: true,
        trace: 'on-first-retry'
    },
});
//# sourceMappingURL=playwright.config.js.map