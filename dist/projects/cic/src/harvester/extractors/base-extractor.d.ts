import { IExtractor } from "./iextractor";
import { PMSExecutor } from "../../pms/pms.executor";
export declare abstract class BaseExtractor implements IExtractor {
    protected pms: PMSExecutor;
    constructor();
    abstract extract(input: any): Promise<any>;
    protected buildPrompt(templateId: string, vars: Record<string, string>): Promise<any>;
}
//# sourceMappingURL=base-extractor.d.ts.map