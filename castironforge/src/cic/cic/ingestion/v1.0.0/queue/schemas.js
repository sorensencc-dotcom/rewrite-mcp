/**
 * CIC Ingestion v1.0.0 — Queue Schemas
 */

export const ingestionJobSchema = {
  type: "object",
  required: ["id", "sourceType", "payloadType", "payload"],
  properties: {
    id: { type: "string" },
    sourceType: { type: "string" },
    payloadType: { type: "string" },
    payload: { type: "object" },
    metadata: { type: "object" }
  },
  additionalProperties: false
};
