import { BaseExtractor } from "./base-extractor.js";
export declare class RelationshipExtractor extends BaseExtractor {
    extract(input: any): Promise<{
        type: string;
        prompt: string;
        pms: any;
        relationships: {
            subject: string;
            object: string;
            predicate: string;
            confidence: number;
        }[];
    }>;
}
//# sourceMappingURL=relationshipExtractor.d.ts.map