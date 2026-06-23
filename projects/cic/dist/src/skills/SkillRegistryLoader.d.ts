export interface Skill {
    name: string;
    version: string;
    raw: string;
    path: string;
    sha256: string;
}
export interface Metrics {
    overall: number;
    structural_completeness?: number;
    heuristic_alignment?: number;
    accessibility_uplift?: number;
    performance_uplift?: number;
    brand_voice_similarity?: number;
    determinism_score?: number;
}
export declare class SkillRegistryLoader {
    private skillsDir;
    private activeSkill;
    private watcher;
    constructor(skillsDir?: string);
    loadSkill(skillPath: string): Promise<Skill>;
    getActiveSkill(): Skill | null;
    watch(onChanged?: (skill: Skill) => void): Promise<void>;
    logDeployment(skill: Skill, metrics: Metrics, previousVersion?: string): Promise<void>;
    closeWatcher(): void;
}
export declare const skillRegistryLoader: SkillRegistryLoader;
