import { BaseExtractor } from "./base-extractor.js";
export declare class SemanticExtractor extends BaseExtractor {
    extract(input: any): Promise<{
        type: string;
        prompt: string;
        pms: any;
        entities: {
            name: string;
            type: string;
            context: string;
        }[];
    }>;
}
//# sourceMappingURL=semanticExtractor.d.ts.map