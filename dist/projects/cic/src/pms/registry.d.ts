/**
 * src/pms/registry.ts
 * Template Registry — v1.0.0
 * Date: 2026-05-29
 */
import { PMSTemplate } from "./types";
export declare class TemplateRegistry {
    private templates;
    private versionIndex;
    register(template: PMSTemplate): void;
    get(id: string): PMSTemplate | null;
    listAll(): PMSTemplate[];
    listActive(): PMSTemplate[];
    listByExtractorType(type: string): PMSTemplate[];
    getVersions(templateId: string): string[];
    getMetrics(): {
        totalTemplates: number;
        activeTemplates: number;
        deprecatedTemplates: number;
        byType: {
            vision: number;
            ocr: number;
            reverse_image: number;
            custom: number;
        };
    };
}
//# sourceMappingURL=registry.d.ts.map