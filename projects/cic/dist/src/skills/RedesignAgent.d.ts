import { Skill } from "./SkillRegistryLoader.js";
export interface RedesignInput {
    dom: string;
    contentBlocks?: any[];
    auditDeltas?: Record<string, string | number>;
    metadata?: {
        url?: string;
        brandVoice?: string;
        [key: string]: any;
    };
}
export declare class RedesignAgent {
    private skill;
    constructor(skill: Skill);
    getSkill(): Skill;
    updateSkill(skill: Skill): void;
    generate(input: RedesignInput): string;
}
