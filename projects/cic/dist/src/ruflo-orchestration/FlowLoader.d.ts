/**
 * FlowLoader
 * Loads flow templates from JSON files
 */
import { FlowRegistry, FlowTemplate } from "./FlowRegistry.js";
export interface FlowsManifest {
    version: string;
    flows: FlowTemplate[];
}
export declare class FlowLoader {
    /**
     * Load flows from JSON file
     */
    static loadFlowsFromFile(filePath: string): FlowTemplate[];
    /**
     * Register flows into registry
     */
    static registerFlows(registry: FlowRegistry, flows: FlowTemplate[]): void;
    /**
     * Load and register flows from file
     */
    static loadAndRegister(registry: FlowRegistry, filePath: string): number;
}
