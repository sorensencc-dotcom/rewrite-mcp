import { MeeTriggerEvent } from "./mee-schema.js";
import { CkgStore } from "../ckg/ckg-store.js";
export declare class MeeTriggerEngine {
    private ckg;
    constructor(ckg: CkgStore);
    detectTriggers(): MeeTriggerEvent[];
    serialize(event: MeeTriggerEvent): object;
    deserialize(raw: any): MeeTriggerEvent;
}
//# sourceMappingURL=mee-trigger.d.ts.map