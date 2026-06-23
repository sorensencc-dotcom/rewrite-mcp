/**
 * src/pms/loader.ts
 * Template Loader — v1.0.0
 * Date: 2026-05-29
 */
import { TemplateRegistry } from "./registry";
export declare class TemplateLoader {
    private templatesDir;
    constructor(templatesDir: string);
    loadFromDirectory(): TemplateRegistry;
    private findTemplateFiles;
    private parseTemplate;
}
