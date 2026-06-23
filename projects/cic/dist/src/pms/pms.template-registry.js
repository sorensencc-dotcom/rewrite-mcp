import { TemplateRegistry } from "./registry";
import { TemplateLoader } from "./loader";
import path from "path";
export class PMSTemplateRegistry extends TemplateRegistry {
    load() {
        const templatesDir = path.resolve(__dirname, "../../pms/templates");
        const loader = new TemplateLoader(templatesDir);
        const registry = loader.loadFromDirectory();
        for (const template of registry.listAll()) {
            this.register(template);
        }
    }
}
//# sourceMappingURL=pms.template-registry.js.map