/**
 * pms-strict/src/schema/promptPackSchema.js
 * Adds 'response_schema' for Strict Mode.
 */
export const promptPackSchema = {
  type: "object",
  required: ["name", "version", "model", "sections", "response_schema"],
  properties: {
    name: { type: "string" },
    version: { type: "string" },
    model: { type: "string", enum: ["gemini"] },
    response_schema: { type: "object" },
    sections: {
      type: "object",
      required: ["system", "instructions"],
      properties: {
        system: { type: "string" },
        instructions: { type: "string" },
        examples: { type: "array" },
        constraints: { type: "string" }
      }
    }
  }
};