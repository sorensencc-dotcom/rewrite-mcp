import { BaseExtractor } from "./base-extractor";
export declare class ImageAnalyzer extends BaseExtractor {
    extract(input: any): Promise<{
        type: string;
        prompt: any;
        metadata: {
            filename: any;
            mime: any;
        };
    }>;
}
