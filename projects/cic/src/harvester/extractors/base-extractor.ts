import { IExtractor } from "./iextractor";
import { PMSExecutor } from "../../pms/pms.executor";

export abstract class BaseExtractor implements IExtractor {
  protected pms: PMSExecutor;

  constructor() {
    this.pms = new PMSExecutor();
    this.pms.initialize();
  }

  abstract extract(input: any): Promise<any>;

  protected async buildPrompt(templateId: string, vars: Record<string, string>) {
    try {
      const result = this.pms.execute(templateId, vars);
      return result.prompt.resolved;
    } catch (err: any) {
      throw new Error(
        `[PMS] Failed to build prompt for template '${templateId}': ${err.message}`
      );
    }
  }
}
