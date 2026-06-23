"use strict";
/**
 * src/pms/executor.ts
 * Template Executor — v1.0.0
 * Date: 2026-05-29
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PMSExecutor = void 0;
const registry_1 = require("./registry");
const loader_1 = require("./loader");
const path_1 = __importDefault(require("path"));
class PMSExecutor {
    constructor(registry) {
        this.registry = registry || new registry_1.TemplateRegistry();
    }
    initialize() {
        const templatesDir = path_1.default.resolve(__dirname, "../../pms/templates");
        const loader = new loader_1.TemplateLoader(templatesDir);
        this.registry = loader.loadFromDirectory();
    }
    execute(reqOrTemplateId, vars) {
        if (typeof reqOrTemplateId === "string") {
            const template = this.registry.get(reqOrTemplateId);
            if (!template) {
                throw new Error(`Template ${reqOrTemplateId} not found in registry`);
            }
            const resolved = this.renderTemplate(template, vars || {});
            return {
                prompt: {
                    resolved
                }
            };
        }
        return this.executeAsync(reqOrTemplateId);
    }
    async executeAsync(req) {
        try {
            const template = this.registry.get(req.templateId);
            if (!template) {
                return {
                    status: "error",
                    templateId: req.templateId,
                    error: `Template ${req.templateId} not found in registry`,
                };
            }
            const renderedPrompt = this.renderTemplate(template, req.vars);
            return {
                status: "success",
                templateId: req.templateId,
                renderedPrompt,
                config: {
                    max_tokens: template.max_tokens,
                    temperature: template.temperature,
                    top_p: template.top_p,
                },
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                status: "error",
                templateId: req.templateId,
                error: message,
            };
        }
    }
    renderTemplate(template, vars) {
        let rendered = template.template;
        for (const [key, value] of Object.entries(vars)) {
            const regex = new RegExp(`\\{${key}\\}`, "g");
            let replacement = "";
            if (typeof value === "string") {
                if ((value.startsWith("{") && value.endsWith("}")) || (value.startsWith("[") && value.endsWith("]"))) {
                    try {
                        const parsed = JSON.parse(value);
                        if (!value.includes("\n")) {
                            replacement = JSON.stringify(parsed).replace(/:/g, ": ").replace(/,/g, ", ");
                        }
                        else {
                            replacement = JSON.stringify(parsed, null, 2);
                        }
                    }
                    catch (e) {
                        replacement = value;
                    }
                }
                else {
                    replacement = value;
                }
            }
            else {
                replacement = JSON.stringify(value, null, 2);
            }
            rendered = rendered.replace(regex, replacement);
        }
        const unreplaced = rendered.match(/\{(\w+)\}/g);
        if (unreplaced) {
            const varName = unreplaced[0].slice(1, -1);
            throw new Error(`Missing required variable: ${varName}`);
        }
        return rendered;
    }
    getRegistry() {
        return this.registry;
    }
}
exports.PMSExecutor = PMSExecutor;
//# sourceMappingURL=executor.js.map