/**
 * src/pms/executor.ts
 * Template Executor — v1.0.0
 * Date: 2026-05-29
 */

import {
  PMSTemplate,
  PMSExecutionRequest,
  PMSExecutionResult,
} from "./types";
import { TemplateRegistry } from "./registry";

export class PMSExecutor {
  private registry: TemplateRegistry;

  constructor(registry?: TemplateRegistry) {
    this.registry = registry || new TemplateRegistry();
  }

  async execute(req: PMSExecutionRequest): Promise<PMSExecutionResult> {
    try {
      const template = this.registry.get(req.templateId);
      if (!template) {
        return {
          status: "error",
          templateId: req.templateId,
          error: `Template ${req.templateId} not found in registry`,
        };
      }

      const renderedPrompt = this.renderTemplate(template, req.vars);

      return {
        status: "success",
        templateId: req.templateId,
        renderedPrompt,
        config: {
          max_tokens: template.max_tokens,
          temperature: template.temperature,
          top_p: template.top_p,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        status: "error",
        templateId: req.templateId,
        error: message,
      };
    }
  }

  private renderTemplate(template: PMSTemplate, vars: Record<string, any>): string {
    let rendered = template.template;

    for (const [key, value] of Object.entries(vars)) {
      const regex = new RegExp(`\\{${key}\\}`, "g");
      let replacement = "";
      if (typeof value === "string") {
        if ((value.startsWith("{") && value.endsWith("}")) || (value.startsWith("[") && value.endsWith("]"))) {
          try {
            const parsed = JSON.parse(value);
            if (!value.includes("\n")) {
              replacement = JSON.stringify(parsed).replace(/:/g, ": ").replace(/,/g, ", ");
            } else {
              replacement = JSON.stringify(parsed, null, 2);
            }
          } catch (e) {
            replacement = value;
          }
        } else {
          replacement = value;
        }
      } else {
        replacement = JSON.stringify(value, null, 2);
      }
      rendered = rendered.replace(regex, replacement);
    }

    const unreplaced = rendered.match(/\{(\w+)\}/g);
    if (unreplaced) {
      const varName = unreplaced[0].slice(1, -1);
      throw new Error(`Missing required variable: ${varName}`);
    }

    return rendered;
  }

  getRegistry(): TemplateRegistry {
    return this.registry;
  }
}
