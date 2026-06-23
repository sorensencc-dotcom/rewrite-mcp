"use strict";
/**
 * src/pms/registry.ts
 * Template Registry — v1.0.0
 * Date: 2026-05-29
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateRegistry = void 0;
class TemplateRegistry {
    constructor() {
        this.templates = new Map();
        this.versionIndex = new Map();
    }
    register(template) {
        if (template.deprecated) {
            console.warn(`[Registry] Registering deprecated template: ${template.template_id}`);
        }
        const key = template.template_id;
        if (this.templates.has(key)) {
            throw new Error(`Template ${key} already registered (version ${this.templates.get(key).version})`);
        }
        this.templates.set(key, template);
        if (!this.versionIndex.has(key)) {
            this.versionIndex.set(key, []);
        }
        this.versionIndex.get(key).push(template.version);
    }
    get(id) {
        return this.templates.get(id) || null;
    }
    listAll() {
        return Array.from(this.templates.values());
    }
    listActive() {
        return Array.from(this.templates.values()).filter((t) => !t.deprecated);
    }
    listByExtractorType(type) {
        return Array.from(this.templates.values()).filter((t) => t.extractor_type === type && !t.deprecated);
    }
    getVersions(templateId) {
        return this.versionIndex.get(templateId) || [];
    }
    getMetrics() {
        return {
            totalTemplates: this.templates.size,
            activeTemplates: this.listActive().length,
            deprecatedTemplates: this.listAll().length - this.listActive().length,
            byType: {
                vision: this.listByExtractorType("vision").length,
                ocr: this.listByExtractorType("ocr").length,
                reverse_image: this.listByExtractorType("reverse_image").length,
                custom: this.listByExtractorType("custom").length,
            },
        };
    }
}
exports.TemplateRegistry = TemplateRegistry;
//# sourceMappingURL=registry.js.map