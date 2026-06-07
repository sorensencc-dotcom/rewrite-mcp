/**
 * pms-claude/src/schema/promptPackSchema.js
 * 2026-05-18 v1.0.0
 */
export const promptPackSchema = {
  type: "object",
  required: ["name", "version", "model", "sections"],
  properties: {
    name: { type: "string" },
    version: { type: "string" },
    model: { type: "string", enum: ["claude"] },
    sections: {
      type: "object",
      required: ["system", "instructions"],
      properties: {
        system: { type: "string" },
        instructions: { type: "string" },
        examples: { type: "array", items: { type: "string" } },
        constraints: { type: "string" }
      }
    }
  }
};