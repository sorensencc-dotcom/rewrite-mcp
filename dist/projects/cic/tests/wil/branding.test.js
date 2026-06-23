"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const branding_1 = __importDefault(require("../../src/wil/branding"));
(0, vitest_1.describe)('BrandingManager (46.8)', () => {
    let manager;
    (0, vitest_1.beforeEach)(() => {
        manager = new branding_1.default();
    });
    (0, vitest_1.describe)('initialization', () => {
        (0, vitest_1.it)('should use default branding config', () => {
            const config = manager.getConfig();
            (0, vitest_1.expect)(config.brand).toBe('CIC');
            (0, vitest_1.expect)(config.primary_color).toBe('#0B1B2B');
            (0, vitest_1.expect)(config.accent_color).toBe('#35C2FF');
        });
        (0, vitest_1.it)('should allow custom config', () => {
            const custom = new branding_1.default({
                brand: 'Custom',
                primary_color: '#FF0000',
                accent_color: '#00FF00'
            });
            const config = custom.getConfig();
            (0, vitest_1.expect)(config.brand).toBe('Custom');
            (0, vitest_1.expect)(config.primary_color).toBe('#FF0000');
            (0, vitest_1.expect)(config.accent_color).toBe('#00FF00');
        });
    });
    (0, vitest_1.describe)('log event branding', () => {
        (0, vitest_1.it)('should add brand to log event', () => {
            const event = {
                timestamp: new Date().toISOString(),
                level: 'info',
                correlationId: 'test-123',
                event: 'task_created',
                taskId: 'task-1'
            };
            const branded = manager.brandLogEvent(event);
            (0, vitest_1.expect)(branded.brand).toBe('CIC');
            (0, vitest_1.expect)(branded.event).toBe('task_created');
            (0, vitest_1.expect)(branded.data?.taskId).toBe('task-1');
        });
        (0, vitest_1.it)('should handle missing fields', () => {
            const event = { event: 'test' };
            const branded = manager.brandLogEvent(event);
            (0, vitest_1.expect)(branded.brand).toBe('CIC');
            (0, vitest_1.expect)(branded.timestamp).toBeDefined();
            (0, vitest_1.expect)(branded.level).toBe('info');
        });
    });
    (0, vitest_1.describe)('artifact branding', () => {
        (0, vitest_1.it)('should add branding to artifact', () => {
            const artifact = {
                id: 'artifact-1',
                name: 'result.txt',
                size_bytes: 1024,
                size_mb: 0.001,
                created_at: new Date().toISOString()
            };
            const branded = manager.brandArtifact(artifact);
            (0, vitest_1.expect)(branded.brand).toBe('CIC');
            (0, vitest_1.expect)(branded.accent_color).toBe('#35C2FF');
            (0, vitest_1.expect)(branded.watermark).toBe('CIC');
            (0, vitest_1.expect)(branded.id).toBe('artifact-1');
        });
        (0, vitest_1.it)('should include all artifact fields', () => {
            const artifact = {
                id: 'artifact-2',
                name: 'data.json',
                size_bytes: 2048,
                size_mb: 0.002,
                created_at: new Date().toISOString()
            };
            const branded = manager.brandArtifact(artifact);
            (0, vitest_1.expect)(branded.id).toBe('artifact-2');
            (0, vitest_1.expect)(branded.name).toBe('data.json');
            (0, vitest_1.expect)(branded.size_bytes).toBe(2048);
            (0, vitest_1.expect)(branded.size_mb).toBe(0.002);
        });
    });
    (0, vitest_1.describe)('session payload branding', () => {
        (0, vitest_1.it)('should add branding to session', () => {
            const session = {
                session_id: 'session-1',
                pipeline_id: 'pipeline-1',
                created_at: new Date().toISOString()
            };
            const branded = manager.brandSessionPayload(session);
            (0, vitest_1.expect)(branded.session_brand).toBe('CIC');
            (0, vitest_1.expect)(branded.session_icon).toContain('session-icon');
            (0, vitest_1.expect)(branded.session_color).toBe('#35C2FF');
            (0, vitest_1.expect)(branded.session_id).toBe('session-1');
        });
        (0, vitest_1.it)('should include all session fields', () => {
            const session = {
                session_id: 'session-2',
                pipeline_id: 'pipeline-2',
                created_at: new Date().toISOString()
            };
            const branded = manager.brandSessionPayload(session);
            (0, vitest_1.expect)(branded.session_id).toBe('session-2');
            (0, vitest_1.expect)(branded.pipeline_id).toBe('pipeline-2');
        });
    });
    (0, vitest_1.describe)('agent graph node', () => {
        (0, vitest_1.it)('should generate agent graph node', () => {
            const node = manager.generateAgentGraphNode();
            (0, vitest_1.expect)(node.id).toBe('cic-foreman');
            (0, vitest_1.expect)(node.label).toBe('CIC');
            (0, vitest_1.expect)(node.type).toBe('agent');
            (0, vitest_1.expect)(node.color).toBe('#0B1B2B');
            (0, vitest_1.expect)(node.accent_color).toBe('#35C2FF');
        });
        (0, vitest_1.it)('should include icon and logo', () => {
            const node = manager.generateAgentGraphNode();
            (0, vitest_1.expect)(node.icon).toBeDefined();
            (0, vitest_1.expect)(node.properties.logo).toBeDefined();
            (0, vitest_1.expect)(node.theme).toBe('dark');
        });
    });
    (0, vitest_1.describe)('asset manifest', () => {
        (0, vitest_1.it)('should generate asset manifest', () => {
            const manifest = manager.generateAssetManifest();
            (0, vitest_1.expect)(manifest.brand).toBe('CIC');
            (0, vitest_1.expect)(manifest.version).toBe('1.0.0');
            (0, vitest_1.expect)(manifest.assets).toBeDefined();
        });
        (0, vitest_1.it)('should include all asset types', () => {
            const manifest = manager.generateAssetManifest();
            (0, vitest_1.expect)(manifest.assets.icons).toBeDefined();
            (0, vitest_1.expect)(manifest.assets.logos).toBeDefined();
            (0, vitest_1.expect)(manifest.assets.session).toBeDefined();
        });
        (0, vitest_1.it)('should include color configuration', () => {
            const manifest = manager.generateAssetManifest();
            (0, vitest_1.expect)(manifest.colors.primary).toBe('#0B1B2B');
            (0, vitest_1.expect)(manifest.colors.accent).toBe('#35C2FF');
        });
        (0, vitest_1.it)('should list all icon sizes', () => {
            const manifest = manager.generateAssetManifest();
            const icons = manifest.assets.icons;
            (0, vitest_1.expect)(icons['icon-16'].size).toBe(16);
            (0, vitest_1.expect)(icons['icon-32'].size).toBe(32);
            (0, vitest_1.expect)(icons['icon-64'].size).toBe(64);
            (0, vitest_1.expect)(icons['icon-128'].size).toBe(128);
        });
    });
    (0, vitest_1.describe)('configuration updates', () => {
        (0, vitest_1.it)('should update branding config', () => {
            manager.updateConfig({
                brand: 'CIC Pro',
                accent_color: '#FF00FF'
            });
            const config = manager.getConfig();
            (0, vitest_1.expect)(config.brand).toBe('CIC Pro');
            (0, vitest_1.expect)(config.accent_color).toBe('#FF00FF');
            (0, vitest_1.expect)(config.primary_color).toBe('#0B1B2B'); // Unchanged
        });
        (0, vitest_1.it)('should reflect updates in branded outputs', () => {
            manager.updateConfig({ brand: 'Updated' });
            const event = manager.brandLogEvent({ event: 'test' });
            const artifact = manager.brandArtifact({ id: 'a1', name: 'f', size_bytes: 0, size_mb: 0, created_at: '' });
            const session = manager.brandSessionPayload({ session_id: 's1', pipeline_id: 'p1', created_at: '' });
            (0, vitest_1.expect)(event.brand).toBe('Updated');
            (0, vitest_1.expect)(artifact.brand).toBe('Updated');
            (0, vitest_1.expect)(session.session_brand).toBe('Updated');
        });
    });
});
//# sourceMappingURL=branding.test.js.map