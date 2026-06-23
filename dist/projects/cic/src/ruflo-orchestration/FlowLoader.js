"use strict";
/**
 * FlowLoader
 * Loads flow templates from JSON files
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlowLoader = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class FlowLoader {
    /**
     * Load flows from JSON file
     */
    static loadFlowsFromFile(filePath) {
        const absolutePath = path_1.default.resolve(filePath);
        if (!fs_1.default.existsSync(absolutePath)) {
            console.warn(`Flows file not found: ${absolutePath}`);
            return [];
        }
        const content = fs_1.default.readFileSync(absolutePath, "utf-8");
        const manifest = JSON.parse(content);
        if (!manifest.flows || !Array.isArray(manifest.flows)) {
            console.warn("Invalid flows manifest: missing flows array");
            return [];
        }
        console.log(`Loaded ${manifest.flows.length} flow templates from ${absolutePath}`);
        return manifest.flows;
    }
    /**
     * Register flows into registry
     */
    static registerFlows(registry, flows) {
        for (const flow of flows) {
            try {
                registry.registerTemplate(flow);
                console.log(`✓ Registered flow: ${flow.id} (${flow.version})`);
            }
            catch (error) {
                console.error(`Failed to register flow ${flow.id}:`, error);
            }
        }
    }
    /**
     * Load and register flows from file
     */
    static loadAndRegister(registry, filePath) {
        const flows = this.loadFlowsFromFile(filePath);
        this.registerFlows(registry, flows);
        return flows.length;
    }
}
exports.FlowLoader = FlowLoader;
//# sourceMappingURL=FlowLoader.js.map