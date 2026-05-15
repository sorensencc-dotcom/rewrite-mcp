/**
 * CIC Harvester v2.0.0 — Web Adapter
 */

export async function harvestWeb(config) {
  // Placeholder: integrate real HTTP fetch.
  return {
    type: "web",
    url: config?.url || null,
    content: config?.mockContent || "<html></html>"
  };
}
