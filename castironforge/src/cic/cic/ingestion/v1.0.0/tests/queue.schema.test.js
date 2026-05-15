/**
 * CIC Ingestion v1.0.0 — Schema Tests (stub)
 */

import { ingestionJobSchema } from "../queue/schemas.js";

export function testSchemaShape() {
  if (!ingestionJobSchema || ingestionJobSchema.type !== "object") {
    throw new Error("Expected ingestionJobSchema to be an object schema");
  }
}
