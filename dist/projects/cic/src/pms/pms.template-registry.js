"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PMSTemplateRegistry = void 0;
const registry_1 = require("./registry");
const loader_1 = require("./loader");
const path_1 = __importDefault(require("path"));
class PMSTemplateRegistry extends registry_1.TemplateRegistry {
    load() {
        const templatesDir = path_1.default.resolve(__dirname, "../../pms/templates");
        const loader = new loader_1.TemplateLoader(templatesDir);
        const registry = loader.loadFromDirectory();
        for (const template of registry.listAll()) {
            this.register(template);
        }
    }
}
exports.PMSTemplateRegistry = PMSTemplateRegistry;
//# sourceMappingURL=pms.template-registry.js.map