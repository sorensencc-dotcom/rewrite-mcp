import { MeeTriggerEngine } from "./mee-trigger.js";
import { MeePhaseGenerator } from "./mee-generator.js";
import { MeePatchSynthesizer } from "./mee-synthesizer.js";
import { MeeValidator } from "./mee-validator.js";
import { MeeProposalStore } from "./mee-proposal-store.js";
export declare class AutoEvolutionEngine {
    private readonly trigger;
    private readonly generator;
    private readonly synth;
    private readonly validator;
    private readonly store;
    private enabled;
    private lastRun;
    private intervalId;
    private requireApproval;
    constructor(trigger: MeeTriggerEngine, generator: MeePhaseGenerator, synth: MeePatchSynthesizer, validator: MeeValidator, store: MeeProposalStore);
    enable(intervalMs?: number): void;
    disable(): void;
    setRequireApproval(req: boolean): void;
    status(): {
        enabled: boolean;
        lastRun: number | null;
        requireApproval: boolean;
    };
    tick(): Promise<void>;
}
//# sourceMappingURL=auto-evolution-engine.d.ts.map