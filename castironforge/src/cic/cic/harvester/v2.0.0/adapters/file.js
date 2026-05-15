/**
 * CIC Harvester v2.0.0 — File Adapter
 */

export async function harvestFile(config) {
  // Placeholder: integrate real filesystem.
  return {
    type: "file",
    path: config?.path || null,
    content: config?.mockContent || ""
  };
}
