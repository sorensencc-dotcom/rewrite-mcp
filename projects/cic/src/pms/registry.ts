/**
 * src/pms/registry.ts
 * Template Registry — v1.0.0
 * Date: 2026-05-29
 */

import { PMSTemplate } from "./types";

export class TemplateRegistry {
  private templates: Map<string, PMSTemplate> = new Map();
  private versionIndex: Map<string, string[]> = new Map();

  register(template: PMSTemplate): void {
    if (template.deprecated) {
      console.warn(
        `[Registry] Registering deprecated template: ${template.template_id}`
      );
    }

    const key = template.template_id;
    if (this.templates.has(key)) {
      throw new Error(
        `Template ${key} already registered (version ${this.templates.get(key)!.version})`
      );
    }

    this.templates.set(key, template);

    if (!this.versionIndex.has(key)) {
      this.versionIndex.set(key, []);
    }
    this.versionIndex.get(key)!.push(template.version);
  }

  get(id: string): PMSTemplate | null {
    return this.templates.get(id) || null;
  }

  listAll(): PMSTemplate[] {
    return Array.from(this.templates.values());
  }

  listActive(): PMSTemplate[] {
    return Array.from(this.templates.values()).filter((t) => !t.deprecated);
  }

  listByExtractorType(type: string): PMSTemplate[] {
    return Array.from(this.templates.values()).filter(
      (t) => t.extractor_type === type && !t.deprecated
    );
  }

  getVersions(templateId: string): string[] {
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
