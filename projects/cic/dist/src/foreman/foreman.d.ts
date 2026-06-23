import { LoaderOptions } from './loader.js';
import { ForemanManifest, ForemanAgent, ForemanSkill, ForemanAdapter } from './types.js';
export interface ForemanOptions extends LoaderOptions {
    manifestPath?: string;
}
export declare class Foreman {
    private manifest?;
    private loader;
    private agents;
    private skills;
    private adapters;
    private isInitialized;
    constructor(options?: ForemanOptions);
    startup(manifestPath?: string): Promise<void>;
    private initializeAgents;
    private initializeAdapters;
    private initializeSkills;
    getAgent(id: string): ForemanAgent | undefined;
    getSkill(id: string): ForemanSkill | undefined;
    getAdapter(id: string): ForemanAdapter | undefined;
    getAgents(): ForemanAgent[];
    getSkills(): ForemanSkill[];
    getAdapters(): ForemanAdapter[];
    getManifest(): ForemanManifest | undefined;
    isReady(): boolean;
    getSecurityPolicy(policyId: string): import("./types.js").ForemanSecurityPolicy | undefined;
    getTaskTemplate(templateId: string): import("./types.js").ForemanTaskTemplate | undefined;
}
export declare function initializeForeman(options?: ForemanOptions): Foreman;
export declare function getForeman(): Foreman;
