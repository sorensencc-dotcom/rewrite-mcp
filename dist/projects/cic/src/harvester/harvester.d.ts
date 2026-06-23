import { IExtractor } from "./extractors/iextractor.js";
export declare class Harvester {
    private registry;
    private vectorIndex;
    constructor();
    register(type: string, extractor: IExtractor): void;
    run(job: {
        type: string;
        payload: any;
    }): Promise<any>;
}
//# sourceMappingURL=harvester.d.ts.map