/**
 * src/pms/loader.ts
 * Template Loader — v1.0.0
 * Date: 2026-05-29
 */
import fs from "fs";
import path from "path";
import yaml from "yaml";
import { TemplateRegistry } from "./registry";
export class TemplateLoader {
    constructor(templatesDir) {
        this.templatesDir = templatesDir;
    }
    loadFromDirectory() {
        const registry = new TemplateRegistry();
        const templateFiles = this.findTemplateFiles(this.templatesDir);
        for (const filePath of templateFiles) {
            try {
                const template = this.parseTemplate(filePath);
                if (template) {
                    registry.register(template);
                    console.log(`[Loader] Registered: ${template.template_id} (v${template.version})`);
                }
            }
            catch (err) {
                console.error(`[Loader] Failed to load ${filePath}:`, err);
            }
        }
        return registry;
    }
    findTemplateFiles(dir) {
        const files = [];
        if (!fs.existsSync(dir)) {
            console.warn(`[Loader] Templates directory not found: ${dir}`);
            return files;
        }
        const walk = (currentPath) => {
            const entries = fs.readdirSync(currentPath, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);
                if (entry.isDirectory()) {
                    walk(fullPath);
                }
                else if (entry.name.endsWith(".yaml") || entry.name.endsWith(".yml")) {
                    files.push(fullPath);
                }
            }
        };
        walk(dir);
        return files;
    }
    parseTemplate(filePath) {
        const content = fs.readFileSync(filePath, "utf-8");
        const parsed = yaml.parse(content);
        const required = [
            "template_id",
            "name",
            "version",
            "extractor_type",
            "content_type",
            "template",
            "created_at",
            "max_tokens",
            "temperature",
            "top_p",
        ];
        for (const field of required) {
            if (!(field in parsed)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        return parsed;
    }
}
//# sourceMappingURL=loader.js.map