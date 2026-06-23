import { SkillTelemetry, InstinctTelemetry } from "./telemetry-types.js";
export interface TelemetrySink {
    recordSkill(event: SkillTelemetry): Promise<void>;
    recordInstinct(event: InstinctTelemetry): Promise<void>;
    enrichInstinct(runId: string, enrichment: Partial<InstinctTelemetry>): Promise<void>;
    querySkills(filter?: Record<string, any>): Promise<SkillTelemetry[]>;
    queryInstincts(filter?: Record<string, any>): Promise<InstinctTelemetry[]>;
    clear(): Promise<void>;
}
export declare class NoopTelemetrySink implements TelemetrySink {
    recordSkill(): Promise<void>;
    recordInstinct(): Promise<void>;
    enrichInstinct(): Promise<void>;
    querySkills(): Promise<never[]>;
    queryInstincts(): Promise<never[]>;
    clear(): Promise<void>;
}
export declare class DefaultTelemetrySink implements TelemetrySink {
    private skillsStore;
    private instinctsStore;
    private logDir;
    constructor(logDir?: string);
    private ensureDir;
    recordSkill(event: SkillTelemetry): Promise<void>;
    recordInstinct(event: InstinctTelemetry): Promise<void>;
    enrichInstinct(runId: string, enrichment: Partial<InstinctTelemetry>): Promise<void>;
    querySkills(filter?: Record<string, any>): Promise<SkillTelemetry[]>;
    queryInstincts(filter?: Record<string, any>): Promise<InstinctTelemetry[]>;
    clear(): Promise<void>;
}
export declare function setTelemetrySink(sink: TelemetrySink): void;
export declare function getTelemetrySink(): TelemetrySink;
