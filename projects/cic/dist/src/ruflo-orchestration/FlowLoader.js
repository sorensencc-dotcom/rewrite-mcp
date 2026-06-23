/**
 * FlowLoader
 * Loads flow templates from JSON files
 */
import fs from "fs";
import path from "path";
export class FlowLoader {
    /**
     * Load flows from JSON file
     */
    static loadFlowsFromFile(filePath) {
        const absolutePath = path.resolve(filePath);
        if (!fs.existsSync(absolutePath)) {
            console.warn(`Flows file not found: ${absolutePath}`);
            return [];
        }
        const content = fs.readFileSync(absolutePath, "utf-8");
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
//# sourceMappingURL=FlowLoader.js.map