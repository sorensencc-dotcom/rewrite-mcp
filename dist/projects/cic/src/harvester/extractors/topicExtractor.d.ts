import { BaseExtractor } from "./base-extractor.js";
export declare class TopicExtractor extends BaseExtractor {
    extract(input: any): Promise<{
        type: string;
        prompt: string;
        pms: any;
        topics: string[];
        categories: string[];
    }>;
}
//# sourceMappingURL=topicExtractor.d.ts.map