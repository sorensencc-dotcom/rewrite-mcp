/**
 * CIC Ingestion v1.0.0 — Sources Index
 */

import { readFileSource } from "./file.js";
import { readUrlSource } from "./url.js";
import { readDriveSource } from "./drive.js";

export async function readFromSource(sourceType, sourceConfig) {
  switch (sourceType) {
    case "file":
      return readFileSource(sourceConfig);
    case "url":
      return readUrlSource(sourceConfig);
    case "drive":
      return readDriveSource(sourceConfig);
    default:
      throw new Error(`INGESTION_UNKNOWN_SOURCE_TYPE: ${sourceType}`);
  }
}
