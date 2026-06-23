"use strict";
/**
 * src/pms/loader.ts
 * Template Loader — v1.0.0
 * Date: 2026-05-29
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateLoader = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const yaml_1 = __importDefault(require("yaml"));
const registry_1 = require("./registry");
class TemplateLoader {
    constructor(templatesDir) {
        this.templatesDir = templatesDir;
    }
    loadFromDirectory() {
        const registry = new registry_1.TemplateRegistry();
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
        if (!fs_1.default.existsSync(dir)) {
            console.warn(`[Loader] Templates directory not found: ${dir}`);
            return files;
        }
        const walk = (currentPath) => {
            const entries = fs_1.default.readdirSync(currentPath, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path_1.default.join(currentPath, entry.name);
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
        const content = fs_1.default.readFileSync(filePath, "utf-8");
        const parsed = yaml_1.default.parse(content);
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
exports.TemplateLoader = TemplateLoader;
//# sourceMappingURL=loader.js.map